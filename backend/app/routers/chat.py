import json
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services import gemini_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_full_health_context(db: Session, user: models.User) -> str:
    """Assemble real user profile, vitals, medications, allergies, and report analyses."""
    lines: List[str] = [f"User: {user.full_name} (role: {user.role})"]

    if user.role == "patient":
        profile = (
            db.query(models.PatientProfile)
            .filter(models.PatientProfile.user_id == user.id)
            .first()
        )
        if profile:
            details = []
            if profile.date_of_birth:
                details.append(f"DOB: {profile.date_of_birth}")
            if profile.gender:
                details.append(f"Gender: {profile.gender}")
            if profile.blood_type:
                details.append(f"Blood Type: {profile.blood_type}")
            if profile.height_cm:
                details.append(f"Height: {profile.height_cm} cm")
            if profile.weight_kg:
                details.append(f"Weight: {profile.weight_kg} kg")
            if details:
                lines.append("Demographics: " + ", ".join(details))
            if profile.medical_notes:
                lines.append(f"Medical Notes: {profile.medical_notes}")

        conditions = db.query(models.Condition).filter(models.Condition.user_id == user.id).all()
        if conditions:
            lines.append(
                "Conditions: " + "; ".join(f"{c.name} [{c.status}]" for c in conditions)
            )

        meds = db.query(models.Medication).filter(models.Medication.user_id == user.id).all()
        if meds:
            lines.append(
                "Medications: "
                + "; ".join(
                    f"{m.name} ({m.dosage or ''} {m.frequency or ''})".strip() for m in meds
                )
            )

        allergies = db.query(models.Allergy).filter(models.Allergy.user_id == user.id).all()
        if allergies:
            lines.append(
                "Allergies: "
                + "; ".join(f"{a.allergen} (severity: {a.severity})" for a in allergies)
            )

        vitals = (
            db.query(models.Vital)
            .filter(models.Vital.user_id == user.id)
            .order_by(models.Vital.recorded_at.desc())
            .limit(10)
            .all()
        )
        if vitals:
            lines.append(
                "Recent Vitals: "
                + "; ".join(f"{v.vital_type}: {v.value} {v.unit or ''}".strip() for v in vitals)
            )

    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == user.id)
        .order_by(models.Report.uploaded_at.desc())
        .limit(5)
        .all()
    )
    if reports:
        report_summaries = []
        for r in reports:
            analysis = (
                db.query(models.Analysis)
                .filter(models.Analysis.report_id == r.id)
                .order_by(models.Analysis.created_at.desc())
                .first()
            )
            if analysis and analysis.result_json:
                try:
                    data = json.loads(analysis.result_json)
                    raw_type = data.get("report_type") or data.get("document_type") or "Report"
                    doc_type = raw_type.get("en", "Report") if isinstance(raw_type, dict) else str(raw_type)
                    raw_summary = data.get("summary") or ""
                    summary = raw_summary.get("en", "") if isinstance(raw_summary, dict) else str(raw_summary)
                    raw_flags = data.get("abnormal_flags") or []
                    flags = raw_flags.get("en", []) if isinstance(raw_flags, dict) else (raw_flags if isinstance(raw_flags, list) else [])
                    report_summaries.append(
                        f"- {r.original_filename} ({doc_type}): {summary}"
                        + (f" Flags: {', '.join(str(x) for x in flags)}" if flags else "")
                    )
                except json.JSONDecodeError:
                    pass
            else:
                report_summaries.append(f"- {r.original_filename} (status: {r.status}, not yet analyzed)")
        if report_summaries:
            lines.append("Uploaded Reports:\n" + "\n".join(report_summaries))

    return "\n".join(lines)


@router.get("/conversations", response_model=List[schemas.ConversationOut])
def list_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == current_user.id)
        .order_by(models.Conversation.updated_at.desc())
        .all()
    )


@router.post("/conversations", response_model=schemas.ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: schemas.ConversationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = (payload.title or "").strip() or (
        "محادثة جديدة" if current_user.language == "ar" else "New Conversation"
    )
    conv = models.Conversation(user_id=current_user.id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    conv = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    return {
        "conversation": schemas.ConversationOut.model_validate(conv),
        "messages": [schemas.MessageOut.model_validate(m) for m in messages],
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.query(models.Message).filter(models.Message.conversation_id == conv.id).delete()
    db.delete(conv)
    db.commit()
    return {"deleted": True, "id": conversation_id}


@router.post("/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    payload: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Send a message to Gemini AI with full user health context and persist both turns."""
    conv = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    prior_messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in prior_messages]
    health_context = _build_full_health_context(db, current_user)
    language = (
        payload.language
        if payload.language in {"en", "ar"}
        else current_user.language
    )

    # Call Gemini BEFORE committing user message so failed API calls leave clean state
    ai_reply = gemini_service.chat_with_context(
        user_message=payload.content.strip(),
        history=history,
        health_context=health_context,
        language=language,
        user_role=current_user.role,
    )

    ar_reply = (ai_reply.get("ar") or "").strip() or None
    en_reply = (ai_reply.get("en") or "").strip() or None
    display_reply = (
        (ar_reply if language == "ar" else en_reply)
        or ai_reply.get("fallback_raw")
        or en_reply
        or ar_reply
        or ""
    )

    user_msg = models.Message(
        conversation_id=conv.id,
        role="user",
        content=payload.content.strip(),
    )
    assistant_msg = models.Message(
        conversation_id=conv.id,
        role="assistant",
        content=display_reply,
        content_ar=ar_reply,
        content_en=en_reply,
    )
    db.add(user_msg)
    db.add(assistant_msg)

    if len(prior_messages) == 0:
        snippet = payload.content.strip().splitlines()[0][:50]
        conv.title = snippet + ("..." if len(payload.content.strip()) > 50 else "")
    conv.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conv)

    return {
        "conversation": schemas.ConversationOut.model_validate(conv),
        "user_message": schemas.MessageOut.model_validate(user_msg),
        "assistant_message": schemas.MessageOut.model_validate(assistant_msg),
    }
