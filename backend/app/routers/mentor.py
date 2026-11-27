import json
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import models
from app.auth import require_role
from app.config import get_settings
from app.database import get_db
from app.services import file_service, gemini_service

router = APIRouter(prefix="/api/mentor", tags=["mentor"])
settings = get_settings()


def _serialize_mentor_analysis(item: models.MentorAnalysis) -> Dict[str, Any]:
    return {
        "id": item.id,
        "report_id": item.report_id,
        "report_type": item.report_type,
        "original_filename": item.original_filename,
        "result": json.loads(item.result_json),
        "model_used": item.model_used,
        "is_demo": item.is_demo,
        "created_at": item.created_at,
    }


@router.get("/samples")
def get_mentor_demo_samples(
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return bundled educational CTG, ECG, and Blood Test demo samples (never presented as real AI output)."""
    samples = db.query(models.MentorSample).all()
    return [
        {
            "id": s.id,
            "title_en": s.title_en,
            "title_ar": s.title_ar,
            "report_type_en": s.report_type_en,
            "report_type_ar": s.report_type_ar,
            "data": json.loads(s.sample_json),
            "is_demo": True,
        }
        for s in samples
    ]


@router.get("/history")
def get_mentor_history(
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    rows = (
        db.query(models.MentorAnalysis)
        .filter(models.MentorAnalysis.user_id == current_user.id)
        .order_by(models.MentorAnalysis.created_at.desc())
        .all()
    )
    return [_serialize_mentor_analysis(r) for r in rows]


@router.post("/analyze", status_code=status.HTTP_201_CREATED)
async def run_mentor_analysis(
    file: UploadFile = File(...),
    report_type: str = Form(default="auto"),
    language: str = Form(default="en"),
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Upload a real medical document and analyze it with Gemini using the 6-card Consultant Mentor structure."""
    safe_filename, content_type, file_size = await file_service.save_upload_file(
        file=file,
        upload_dir=settings.UPLOAD_DIR,
        max_size=settings.MAX_UPLOAD_SIZE,
    )

    report = models.Report(
        user_id=current_user.id,
        filename=safe_filename,
        original_filename=file.filename or safe_filename,
        content_type=content_type,
        file_size=file_size,
        status="analyzing",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    file_bytes = file_service.read_file_bytes(report.filename, settings.UPLOAD_DIR)
    lang = language if language in {"en", "ar"} else current_user.language
    has_previous_analysis = (
        db.query(models.MentorAnalysis)
        .filter(models.MentorAnalysis.report_id == report.id)
        .first()
        is not None
    )

    try:
        ai_out = gemini_service.analyze_mentor_report(
            file_bytes=file_bytes,
            mime_type=content_type,
            original_filename=report.original_filename,
            report_type_hint=report_type,
            language=lang,
        )
    except gemini_service.GeminiServiceError as exc:
        report.last_error_json = json.dumps(exc.error_detail, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise
    except HTTPException as exc:
        error_payload = (
            exc.detail
            if isinstance(exc.detail, dict)
            else {"message": {"ar": str(exc.detail), "en": str(exc.detail)}}
        )
        report.last_error_json = json.dumps(error_payload, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise
    except Exception:
        fallback_err = gemini_service.GeminiServiceError("service_unavailable")
        report.last_error_json = json.dumps(fallback_err.error_detail, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise fallback_err

    mentor_row = models.MentorAnalysis(
        user_id=current_user.id,
        report_id=report.id,
        report_type=report_type,
        original_filename=report.original_filename,
        result_json=json.dumps(ai_out["result"], ensure_ascii=False),
        model_used=ai_out["model_used"],
        is_demo=False,
    )
    db.add(mentor_row)
    report.status = "analyzed"
    report.last_error_json = None
    db.commit()
    db.refresh(mentor_row)

    return _serialize_mentor_analysis(mentor_row)
