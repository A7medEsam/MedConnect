import base64
import json
import logging
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from app.config import get_timeout_config, resolve_gemini_config

logger = logging.getLogger("medconnect.gemini")


def _collect_timeout_exceptions() -> Tuple[type, ...]:
    """Collect timeout-specific exception types across stdlib, google-genai, and httpx2/httpx."""
    types_list: List[type] = [TimeoutError, FuturesTimeoutError]
    cont_err = getattr(genai_errors, "ContinuationInterruptedError", None)
    if isinstance(cont_err, type):
        types_list.append(cont_err)
    for mod_attr in ("httpx2", "httpx"):
        mod = getattr(genai_errors, mod_attr, None)
        if mod is not None:
            for exc_name in ("TimeoutException", "ReadTimeout", "WriteTimeout", "ConnectTimeout", "PoolTimeout"):
                exc_cls = getattr(mod, exc_name, None)
                if isinstance(exc_cls, type):
                    types_list.append(exc_cls)
    return tuple(dict.fromkeys(types_list))


def _collect_network_exceptions() -> Tuple[type, ...]:
    """Collect connection/transport exception types (excluding timeout types)."""
    types_list: List[type] = [ConnectionError]
    for mod_attr in ("httpx2", "httpx"):
        mod = getattr(genai_errors, mod_attr, None)
        if mod is not None:
            for exc_name in ("ConnectError", "RemoteProtocolError", "TransportError"):
                exc_cls = getattr(mod, exc_name, None)
                if isinstance(exc_cls, type):
                    types_list.append(exc_cls)
    return tuple(dict.fromkeys(types_list))


_TIMEOUT_EXCEPTIONS = _collect_timeout_exceptions()
_NETWORK_EXCEPTIONS = _collect_network_exceptions()


ERROR_MESSAGES: Dict[str, Dict[str, str]] = {
    "not_configured": {
        "ar": "خدمة الذكاء الاصطناعي غير مفعّلة حالياً على الخادم لعدم ضبط مفتاح GEMINI_API_KEY.",
        "en": "AI service is not configured on the server because GEMINI_API_KEY is missing.",
    },
    "quota_exceeded": {
        "ar": "بلغ التطبيق الحد المسموح لاستخدام الذكاء الاصطناعي حالياً. يمكنك مراجعة نتائجك السابقة والمحاولة لاحقاً.",
        "en": "AI usage quota is currently exhausted. You can review your previously saved results and try again later.",
    },
    "auth_invalid": {
        "ar": "تعذر التحقق من صلاحية مفتاح Gemini API على الخادم. يرجى مراجعة الإعدادات وإعادة تشغيل الخادم.",
        "en": "Gemini API authentication failed. Please verify GEMINI_API_KEY on the backend and restart the server.",
    },
    "permission_denied": {
        "ar": "لا يملك مفتاح Gemini API الصلاحية المطلوبة للوصول إلى هذا النموذج أو الخدمة.",
        "en": "The configured Gemini API key does not have permission to access this model or service.",
    },
    "model_unavailable": {
        "ar": "نموذج الذكاء الاصطناعي المحدد غير متاح أو غير مدعوم حالياً. يرجى مراجعة إعداد GEMINI_MODEL.",
        "en": "The configured Gemini model is unavailable or unsupported. Please check GEMINI_MODEL on the backend.",
    },
    "service_unavailable": {
        "ar": "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. بياناتك ونتائجك السابقة ما زالت محفوظة.",
        "en": "The AI service is temporarily unavailable. Your saved data and previous results remain safe.",
    },
    "network_error": {
        "ar": "تعذر الاتصال بخدمة Gemini بسبب مشكلة في الشبكة. بياناتك ونتائجك السابقة ما زالت محفوظة.",
        "en": "Could not reach the Gemini service due to a network error. Your saved data and previous results remain safe.",
    },
    "request_timeout": {
        "ar": "استغرق الطلب وقتاً أطول من المسموح. لم تصلنا نتيجة مكتملة. يمكنك المحاولة مرة أخرى.",
        "en": "The request took longer than allowed and did not return a complete result. You can try again.",
    },
    "invalid_response": {
        "ar": "تعذر قراءة استجابة صالحة من خدمة الذكاء الاصطناعي لهذا الطلب. يمكنك المحاولة مرة أخرى.",
        "en": "Could not parse a valid structured response from the AI service. Please try again.",
    },
}


class GeminiServiceError(HTTPException):
    """Structured, safe bilingual error raised for all Gemini failures (never exposes secrets)."""

    def __init__(
        self,
        category: str,
        status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE,
        retry_after_seconds: Optional[int] = None,
        retryable: bool = False,
        request_id: Optional[str] = None,
    ):
        req_id = request_id or f"mc-ai-{uuid.uuid4().hex[:8]}"
        msg = ERROR_MESSAGES.get(category, ERROR_MESSAGES["service_unavailable"])
        detail = {
            "category": category,
            "message": msg,
            "retry_after_seconds": retry_after_seconds,
            "retryable": retryable,
            "request_id": req_id,
        }
        super().__init__(status_code=status_code, detail=detail)
        self.error_detail = detail


def _extract_retry_seconds(exc: Exception) -> Optional[int]:
    """Safely extract retry delay in seconds if present on Google API error without leaking raw text."""
    for attr in ("retry_delay", "retry_after"):
        val = getattr(exc, attr, None)
        if isinstance(val, (int, float)) and val > 0:
            return int(val)
        sec = getattr(val, "seconds", None)
        if isinstance(sec, (int, float)) and sec > 0:
            return int(sec)

    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers:
        retry_hdr = headers.get("retry-after") or headers.get("Retry-After")
        if retry_hdr is not None:
            try:
                parsed_hdr = int(float(str(retry_hdr).strip()))
                if parsed_hdr > 0:
                    return parsed_hdr
            except ValueError:
                pass

    raw_parts = [str(exc)]
    msg = getattr(exc, "message", None)
    if msg:
        raw_parts.append(str(msg))
    details = getattr(exc, "details", None)
    if details:
        raw_parts.append(str(details))
    raw = " ".join(raw_parts)

    match = re.search(r"retry\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*s", raw, re.IGNORECASE)
    if match:
        return max(1, int(float(match.group(1))))
    match_sec = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", raw, re.IGNORECASE)
    if match_sec:
        return max(1, int(match_sec.group(1)))
    return None


def _map_gemini_exception(exc: Exception, request_id: str) -> GeminiServiceError:
    """Classify Google GenAI SDK / Interactions / HTTP exceptions into 9 safe bilingual categories."""
    if isinstance(exc, GeminiServiceError):
        return exc

    cls_name = type(exc).__name__.lower()
    http_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    api_status = str(getattr(exc, "status", "") or "").lower()
    raw = f"{api_status} {getattr(exc, 'message', '') or ''} {str(exc)}".lower()
    retry_secs = _extract_retry_seconds(exc)

    # Never log full raw exception strings if they could echo headers/URLs; strip key-like patterns
    safe_summary = re.sub(r"(AIza[0-9A-Za-z\-_]+|key=[^&\s]+)", "[REDACTED]", str(exc)[:300])
    logger.warning("Gemini call failed [%s] (%s): %s", request_id, type(exc).__name__, safe_summary)

    if (
        http_code == 429
        or "ratelimit" in cls_name
        or "resourceexhausted" in cls_name
        or "resource_exhausted" in raw
        or "429" in raw
        or "quota" in raw
        or "rate limit" in raw
    ):
        return GeminiServiceError(
            category="quota_exceeded",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            retry_after_seconds=retry_secs,
            retryable=False,  # Prevent automatic retry loops while quota is exhausted
            request_id=request_id,
        )

    if (
        http_code == 401
        or "unauthenticated" in cls_name
        or "authentication" in cls_name
        or "401" in raw
        or "api_key_invalid" in raw
        or "api key not valid" in raw
    ):
        return GeminiServiceError(
            category="auth_invalid",
            status_code=status.HTTP_401_UNAUTHORIZED,
            retryable=False,
            request_id=request_id,
        )

    if (
        http_code == 403
        or "permissiondenied" in cls_name
        or "403" in raw
        or "permission_denied" in raw
        or "permission denied" in raw
    ):
        return GeminiServiceError(
            category="permission_denied",
            status_code=status.HTTP_403_FORBIDDEN,
            retryable=False,
            request_id=request_id,
        )

    if (
        http_code == 404
        or "notfound" in cls_name
        or "404" in raw
        or "not found for api version" in raw
        or "not_found" in raw
        or "not supported for" in raw
    ):
        return GeminiServiceError(
            category="model_unavailable",
            status_code=status.HTTP_404_NOT_FOUND,
            retryable=False,
            request_id=request_id,
        )

    if (
        isinstance(exc, _TIMEOUT_EXCEPTIONS)
        or http_code in (408, 504)
        or "timeout" in cls_name
        or "deadline" in cls_name
        or "timed out" in raw
        or "deadline exceeded" in raw
    ):
        return GeminiServiceError(
            category="request_timeout",
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            retry_after_seconds=None,
            retryable=True,
            request_id=request_id,
        )

    if (
        isinstance(exc, _NETWORK_EXCEPTIONS)
        or "connection" in cls_name
        or "connect" in cls_name
        or "transport" in cls_name
        or "network" in raw
        or "name or service not known" in raw
        or "getaddrinfo" in raw
    ):
        return GeminiServiceError(
            category="network_error",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            retry_after_seconds=retry_secs,
            retryable=True,
            request_id=request_id,
        )

    return GeminiServiceError(
        category="service_unavailable",
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        retry_after_seconds=retry_secs,
        retryable=True,
        request_id=request_id,
    )


def _get_configured_client(request_id: str, timeout_seconds: Optional[float] = None) -> Tuple[genai.Client, str]:
    """Resolve authoritative GEMINI_API_KEY and return a Gemini Client with single-attempt HttpOptions."""
    api_key, model_name, google_key_present = resolve_gemini_config()

    if google_key_present:
        logger.warning(
            "[%s] GOOGLE_API_KEY is present in environment; ignoring it so GEMINI_API_KEY remains authoritative.",
            request_id,
        )
        os.environ.pop("GOOGLE_API_KEY", None)

    if not api_key:
        raise GeminiServiceError(
            category="not_configured",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            retryable=False,
            request_id=request_id,
        )

    http_options = genai_types.HttpOptions(
        timeout=max(1000, int(timeout_seconds * 1000)) if timeout_seconds else None,
        retry_options=genai_types.HttpRetryOptions(attempts=1),
    )
    client = genai.Client(api_key=api_key, http_options=http_options)
    return client, model_name


def _run_interaction_with_deadline(
    client: genai.Client,
    deadline_seconds: float,
    request_id: str,
    **create_kwargs: Any,
) -> Any:
    """Execute client.interactions.create() under an enforced end-to-end deadline."""
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(
        client.interactions.create,
        timeout=deadline_seconds,
        **create_kwargs,
    )
    try:
        return future.result(timeout=deadline_seconds)
    except FuturesTimeoutError as exc:
        logger.warning("Gemini interaction timed out after %.2fs [%s]", deadline_seconds, request_id)
        try:
            future.cancel()
        except Exception:
            pass
        close_fn = getattr(client, "close", None)
        if callable(close_fn):
            try:
                close_fn()
            except Exception:
                pass
        executor.shutdown(wait=False, cancel_futures=True)
        raise GeminiServiceError(
            category="request_timeout",
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            retry_after_seconds=None,
            retryable=True,
            request_id=request_id,
        ) from exc
    except Exception as exc:
        executor.shutdown(wait=False, cancel_futures=True)
        raise _map_gemini_exception(exc, request_id)
    finally:
        close_fn = getattr(client, "close", None)
        if callable(close_fn):
            try:
                close_fn()
            except Exception:
                pass
        executor.shutdown(wait=False)


def _build_media_input_block(file_bytes: bytes, mime_type: str) -> Dict[str, Any]:
    """Encode raw file bytes as a base64 Interactions API image or document block."""
    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    normalized_mime = (mime_type or "application/octet-stream").strip().lower()
    block_type = "image" if normalized_mime.startswith("image/") else "document"
    return {
        "type": block_type,
        "data": b64_data,
        "mime_type": normalized_mime,
    }


def _extract_interaction_text(interaction: Any) -> str:
    """Extract text safely from an Interactions API Interaction object."""
    output_text = getattr(interaction, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: List[str] = []
    for step in getattr(interaction, "steps", None) or []:
        step_type = getattr(step, "type", None) or (step.get("type") if isinstance(step, dict) else None)
        if step_type != "model_output":
            continue
        content = getattr(step, "content", None) or (step.get("content") if isinstance(step, dict) else None) or []
        for item in content:
            item_type = getattr(item, "type", None) or (item.get("type") if isinstance(item, dict) else None)
            if item_type == "text":
                txt = getattr(item, "text", None) if not isinstance(item, dict) else item.get("text")
                if isinstance(txt, str) and txt:
                    parts.append(txt)

    if parts:
        return "".join(parts).strip()

    for out in getattr(interaction, "outputs", None) or []:
        txt = getattr(out, "text", None) if not isinstance(out, dict) else out.get("text")
        if isinstance(txt, str) and txt:
            parts.append(txt)
    return "".join(parts).strip()


def _extract_json_object(raw_text: str) -> Optional[Dict[str, Any]]:
    """Parse JSON from Gemini response, handling optional markdown code fences."""
    cleaned = (raw_text or "").strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return None


def _ensure_bilingual_text(val: Any, fallback_ar: str = "", fallback_en: str = "") -> Dict[str, str]:
    if isinstance(val, dict):
        return {
            "ar": str(val.get("ar") or fallback_ar).strip(),
            "en": str(val.get("en") or fallback_en).strip(),
        }
    if isinstance(val, str) and val.strip():
        return {"ar": val.strip(), "en": val.strip()}
    return {"ar": fallback_ar, "en": fallback_en}


def _ensure_bilingual_list(val: Any) -> Dict[str, List[str]]:
    if isinstance(val, dict):
        ar_list = [str(x).strip() for x in (val.get("ar") or []) if str(x).strip()]
        en_list = [str(x).strip() for x in (val.get("en") or []) if str(x).strip()]
        return {"ar": ar_list, "en": en_list}
    if isinstance(val, list):
        items = [str(x).strip() for x in val if str(x).strip()]
        return {"ar": items, "en": items}
    return {"ar": [], "en": []}


def _validate_and_normalize_report(parsed: Dict[str, Any], model_name: str) -> Dict[str, Any]:
    """Validate and normalize bilingual report JSON structure before saving to SQLite."""
    raw_measures = parsed.get("measurements") or parsed.get("key_values") or []
    measurements = []
    if isinstance(raw_measures, list):
        for item in raw_measures:
            if not isinstance(item, dict):
                continue
            measurements.append({
                "name": _ensure_bilingual_text(item.get("name"), "قياس", "Measurement"),
                "value": str(item.get("value") or "").strip(),
                "unit": str(item.get("unit") or "").strip(),
                "reference_range": str(item.get("reference_range") or "").strip(),
                "status": str(item.get("status") or "unknown").strip().lower(),
            })

    urgency = str(parsed.get("urgency_level") or "routine").strip().lower()
    if urgency not in {"routine", "follow_up_soon", "urgent"}:
        urgency = "routine"

    return {
        "schema_version": "bilingual_v2",
        "analysis_source": "gemini_ai",
        "model_used": model_name,
        "report_type": _ensure_bilingual_text(
            parsed.get("report_type") or parsed.get("document_type"),
            "تقرير طبي",
            "Medical Report",
        ),
        "summary": _ensure_bilingual_text(parsed.get("summary")),
        "findings": _ensure_bilingual_list(parsed.get("findings")),
        "measurements": measurements,
        "observations": _ensure_bilingual_list(parsed.get("observations")),
        "abnormal_flags": _ensure_bilingual_list(parsed.get("abnormal_flags")),
        "recommendations": _ensure_bilingual_list(parsed.get("recommendations")),
        "questions_for_doctor": _ensure_bilingual_list(parsed.get("questions_for_doctor")),
        "limitations": _ensure_bilingual_text(
            parsed.get("limitations"),
            "تعتمد دقة التحليل على وضوح المستند المرفوع واكتماله.",
            "Analysis accuracy depends on the clarity and completeness of the uploaded document.",
        ),
        "medical_review_notice": _ensure_bilingual_text(
            parsed.get("medical_review_notice") or parsed.get("disclaimer"),
            "ملخص بالذكاء الاصطناعي لأغراض التثقيف فقط؛ راجع طبيبك المختص للتشخيص والعلاج.",
            "Informational AI summary only; consult a licensed physician for diagnosis and treatment.",
        ),
        "urgency_level": urgency,
    }


def analyze_medical_report(
    file_bytes: bytes,
    mime_type: str,
    original_filename: str,
    language: str = "en",
    patient_context: Optional[str] = None,
) -> Dict[str, Any]:
    """Send the actual uploaded PDF/image via Interactions API under the 90s deadline."""
    request_id = f"mc-rep-{uuid.uuid4().hex[:8]}"
    _, report_timeout, _ = get_timeout_config()
    client, model_name = _get_configured_client(request_id, timeout_seconds=report_timeout)

    context_block = (
        f"\nPatient health context from profile:\n{patient_context}\n"
        if patient_context
        else ""
    )

    prompt = f"""You are a medical AI assistant helping a patient and their physician understand an uploaded medical report or clinical image ({original_filename}).
Examine the attached document/image directly and carefully.
Generate BOTH Arabic ("ar") and English ("en") versions in the SAME JSON response from this single uploaded document.
CRITICAL RULES:
1. Only state observations, values, and findings genuinely visible in the uploaded file.
2. Never fabricate measurements, units, or reference ranges. Preserve numerical values and units identically in both languages.
3. Preserve medical abbreviations accurately (e.g., HbA1c, LDL-C, MCV, ECG, TSH) and explain them clearly in each language.
4. Keep probabilities null or uncalculated when not supported by the document.
5. If parts are illegible or missing, state that honestly inside "limitations".
{context_block}
Return ONLY valid JSON (no markdown commentary) with this exact bilingual structure:
{{
  "report_type": {{ "ar": "...", "en": "..." }},
  "summary": {{ "ar": "...", "en": "..." }},
  "findings": {{ "ar": ["..."], "en": ["..."] }},
  "measurements": [
    {{
      "name": {{ "ar": "...", "en": "..." }},
      "value": "exact number/value",
      "unit": "unit e.g. mg/dL or %",
      "reference_range": "range if shown",
      "status": "normal | high | low | abnormal | unknown"
    }}
  ],
  "observations": {{ "ar": ["..."], "en": ["..."] }},
  "abnormal_flags": {{ "ar": ["..."], "en": ["..."] }},
  "recommendations": {{ "ar": ["..."], "en": ["..."] }},
  "questions_for_doctor": {{ "ar": ["..."], "en": ["..."] }},
  "limitations": {{ "ar": "...", "en": "..." }},
  "medical_review_notice": {{
    "ar": "ملخص توضيحي فقط؛ يجب مراجعة الطبيب المختص قبل أي قرار علاجي.",
    "en": "Informational summary only; consult a licensed physician before clinical decisions."
  }},
  "urgency_level": "routine | follow_up_soon | urgent"
}}"""

    media_block = _build_media_input_block(file_bytes, mime_type)
    interaction = _run_interaction_with_deadline(
        client,
        report_timeout,
        request_id,
        model=model_name,
        input=[
            media_block,
            {"type": "text", "text": prompt},
        ],
        store=False,
    )
    raw_text = _extract_interaction_text(interaction)

    parsed = _extract_json_object(raw_text)
    if not parsed:
        raise GeminiServiceError(
            category="invalid_response",
            status_code=status.HTTP_502_BAD_GATEWAY,
            retryable=True,
            request_id=request_id,
        )

    normalized = _validate_and_normalize_report(parsed, model_name)
    return {"result": normalized, "model_used": model_name}


def chat_with_context(
    user_message: str,
    history: List[Dict[str, str]],
    health_context: str,
    language: str = "en",
    user_role: str = "patient",
) -> Dict[str, str]:
    """Send a conversation turn via Interactions API under the 45s deadline and return bilingual {ar, en} reply."""
    request_id = f"mc-chat-{uuid.uuid4().hex[:8]}"
    chat_timeout, _, _ = get_timeout_config()
    client, model_name = _get_configured_client(request_id, timeout_seconds=chat_timeout)

    role_guidance = (
        "You are assisting a physician reviewing clinical topics and patient care considerations."
        if user_role == "doctor"
        else "You are assisting a patient understanding their health profile, lab reports, medications, and symptoms."
    )

    system_instruction = (
        f"You are MedConnect AI, a helpful medical information assistant. {role_guidance} "
        "Base answers on the user's actual saved health profile and uploaded report summaries provided below when relevant. "
        "Never fabricate lab results or measurements not present in the context. "
        "Preserve numerical values, units, and medical abbreviations identically in both Arabic and English. "
        "Always remind users to seek licensed medical evaluation for urgent symptoms or treatment decisions.\n"
        "Return ONLY valid JSON in this exact format:\n"
        '{"reply": {"ar": "الرد الكامل باللغة العربية الواضحة", "en": "Complete response in clear English"}}\n\n'
        f"--- USER HEALTH & REPORTS CONTEXT ---\n{health_context}\n--- END CONTEXT ---"
    )

    steps: List[Dict[str, Any]] = []
    for item in history[-16:]:
        step_type = "model_output" if item["role"] == "assistant" else "user_input"
        steps.append({
            "type": step_type,
            "content": [{"type": "text", "text": item["content"]}],
        })
    steps.append({
        "type": "user_input",
        "content": [{"type": "text", "text": user_message}],
    })

    interaction = _run_interaction_with_deadline(
        client,
        chat_timeout,
        request_id,
        model=model_name,
        system_instruction=system_instruction,
        input=steps,
        store=False,
    )
    raw_text = _extract_interaction_text(interaction)

    if not raw_text:
        raise GeminiServiceError(
            category="invalid_response",
            status_code=status.HTTP_502_BAD_GATEWAY,
            retryable=True,
            request_id=request_id,
        )

    parsed = _extract_json_object(raw_text)
    if parsed and isinstance(parsed.get("reply"), dict):
        ar_text = str(parsed["reply"].get("ar") or "").strip()
        en_text = str(parsed["reply"].get("en") or "").strip()
        if ar_text or en_text:
            return {
                "ar": ar_text or en_text,
                "en": en_text or ar_text,
            }

    raise GeminiServiceError(
        category="invalid_response",
        status_code=status.HTTP_502_BAD_GATEWAY,
        retryable=True,
        request_id=request_id,
    )


def analyze_mentor_report(
    file_bytes: bytes,
    mime_type: str,
    original_filename: str,
    report_type_hint: str = "auto",
    language: str = "en",
) -> Dict[str, Any]:
    """Send an uploaded document via Interactions API under the 90s deadline and return bilingual 6-card Mentor analysis."""
    request_id = f"mc-mnt-{uuid.uuid4().hex[:8]}"
    _, report_timeout, _ = get_timeout_config()
    client, model_name = _get_configured_client(request_id, timeout_seconds=report_timeout)

    prompt = f"""You are a senior consultant acting as a clinical mentor for a physician reviewing an uploaded report ({original_filename}, declared type: {report_type_hint}).
Examine the attached file directly and honestly.
Provide BOTH Arabic ("ar") and English ("en") inside every bilingual text object {{"ar": "...", "en": "..."}} in the SAME JSON response.

CRITICAL HONESTY & SAFETY RULES:
1. Only cite findings, measurements, and observations actually visible in the uploaded document.
2. Supported focus: CTG, ECG, or Blood Test / Lab Panels. If another document type or non-medical, set "supported_report_type": false and explain honestly.
3. NEVER invent diagnostic probabilities. Only set numeric "probability" if explicitly documented or derived from a named documented clinical score; otherwise set "probability": null and "probability_status": "not-calculated".
4. Preserve numerical values, units, and standard abbreviations identically in both languages.

Return ONLY valid JSON matching this exact schema:
{{
  "supported_report_type": true,
  "unsupported_reason": {{ "ar": "", "en": "" }},
  "report_title": {{ "ar": "...", "en": "..." }},
  "report_type": {{ "ar": "...", "en": "..." }},
  "guidelines": ["NICE"],
  "probability_note": {{ "ar": "...", "en": "..." }},
  "sample_measures": [
    {{ "name": {{ "ar": "...", "en": "..." }}, "value": "...", "note": {{ "ar": "...", "en": "..." }} }}
  ],
  "pathophysiology": {{
    "physiology": {{ "ar": "...", "en": "..." }},
    "pathology": {{ "ar": "...", "en": "..." }}
  }},
  "differentials": [
    {{
      "dx": {{ "ar": "...", "en": "..." }},
      "probability": null,
      "probability_status": "not-calculated",
      "justification": {{ "ar": "...", "en": "..." }},
      "severity": {{ "ar": "...", "en": "..." }}
    }}
  ],
  "decision": {{
    "intervene": {{ "ar": "...", "en": "..." }},
    "observe": {{ "ar": "...", "en": "..." }}
  }},
  "pitfalls": {{
    "refs": {{ "ar": "...", "en": "..." }},
    "reference_ids": [],
    "pitfalls": [{{ "ar": "...", "en": "..." }}]
  }},
  "pearls": {{
    "pearls": [{{ "ar": "...", "en": "..." }}],
    "patient_script": {{ "ar": "...", "en": "..." }}
  }},
  "quiz": [
    {{
      "q": {{ "ar": "...", "en": "..." }},
      "options": [{{ "ar": "...", "en": "..." }}, {{ "ar": "...", "en": "..." }}, {{ "ar": "...", "en": "..." }}, {{ "ar": "...", "en": "..." }}],
      "correct": 0,
      "rationale": {{ "ar": "...", "en": "..." }}
    }}
  ]
}}"""

    media_block = _build_media_input_block(file_bytes, mime_type)
    interaction = _run_interaction_with_deadline(
        client,
        report_timeout,
        request_id,
        model=model_name,
        input=[
            media_block,
            {"type": "text", "text": prompt},
        ],
        store=False,
    )
    raw_text = _extract_interaction_text(interaction)

    parsed = _extract_json_object(raw_text)
    if not parsed:
        raise GeminiServiceError(
            category="invalid_response",
            status_code=status.HTTP_502_BAD_GATEWAY,
            retryable=True,
            request_id=request_id,
        )

    # Enforce null probability unless genuinely numeric
    if isinstance(parsed.get("differentials"), list):
        for diff in parsed["differentials"]:
            if isinstance(diff, dict) and not isinstance(diff.get("probability"), (int, float)):
                diff["probability"] = None
                diff["probability_status"] = "not-calculated"

    parsed["schema_version"] = "bilingual_v2"
    parsed["is_demo"] = False
    parsed["analysis_source"] = "gemini_ai"
    parsed["model_used"] = model_name
    return {"result": parsed, "model_used": model_name}
