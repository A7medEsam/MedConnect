import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.services import file_service, gemini_service

router = APIRouter(prefix="/api/reports", tags=["reports"])
settings = get_settings()


def serialize_analysis(analysis: Optional[models.Analysis]) -> Optional[Dict[str, Any]]:
    if not analysis:
        return None
    parsed = None
    if analysis.result_json:
        try:
            parsed = json.loads(analysis.result_json)
        except json.JSONDecodeError:
            parsed = {"summary": analysis.result_json}
    return {
        "id": analysis.id,
        "report_id": analysis.report_id,
        "user_id": analysis.user_id,
        "result": parsed,
        "model_used": analysis.model_used,
        "created_at": analysis.created_at,
    }


def serialize_report(db: Session, report: models.Report) -> Dict[str, Any]:
    latest_analysis = (
        db.query(models.Analysis)
        .filter(models.Analysis.report_id == report.id)
        .order_by(models.Analysis.created_at.desc())
        .first()
    )
    last_error = None
    if report.last_error_json:
        try:
            last_error = json.loads(report.last_error_json)
        except json.JSONDecodeError:
            last_error = None

    return {
        "id": report.id,
        "user_id": report.user_id,
        "filename": report.filename,
        "original_filename": report.original_filename,
        "content_type": report.content_type,
        "file_size": report.file_size,
        "uploaded_at": report.uploaded_at,
        "status": report.status,
        "analysis": serialize_analysis(latest_analysis),
        "last_error": last_error,
    }


def _can_access_report(db: Session, user: models.User, report: models.Report) -> bool:
    if report.user_id == user.id:
        return True
    if user.role == "doctor":
        shared = (
            db.query(models.SharedAccess)
            .filter(
                models.SharedAccess.doctor_id == user.id,
                models.SharedAccess.patient_id == report.user_id,
                models.SharedAccess.status == "active",
            )
            .first()
        )
        return shared is not None
    return False


def _build_patient_context_string(db: Session, user_id: int) -> str:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    profile = (
        db.query(models.PatientProfile)
        .filter(models.PatientProfile.user_id == user_id)
        .first()
    )
    conditions = db.query(models.Condition).filter(models.Condition.user_id == user_id).all()
    meds = db.query(models.Medication).filter(models.Medication.user_id == user_id).all()
    allergies = db.query(models.Allergy).filter(models.Allergy.user_id == user_id).all()

    parts = []
    if user:
        parts.append(f"Patient: {user.full_name}")
    if profile:
        if profile.date_of_birth:
            parts.append(f"DOB: {profile.date_of_birth}")
        if profile.gender:
            parts.append(f"Gender: {profile.gender}")
        if profile.blood_type:
            parts.append(f"Blood Type: {profile.blood_type}")
    if conditions:
        parts.append("Conditions: " + ", ".join(f"{c.name} ({c.status})" for c in conditions))
    if meds:
        parts.append("Medications: " + ", ".join(f"{m.name} {m.dosage or ''}".strip() for m in meds))
    if allergies:
        parts.append("Allergies: " + ", ".join(f"{a.allergen} ({a.severity})" for a in allergies))
    return "\n".join(parts)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Upload a real PDF or medical image file and persist metadata in SQLite."""
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
        status="uploaded",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return serialize_report(db, report)


@router.post("/{report_id}/analyze")
def analyze_report(
    report_id: int,
    payload: Optional[schemas.AnalyzeRequest] = Body(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Read the uploaded file bytes from disk and analyze them with Gemini AI."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if not _can_access_report(db, current_user, report):
        raise HTTPException(status_code=403, detail="Access denied to this report.")

    file_bytes = file_service.read_file_bytes(report.filename, settings.UPLOAD_DIR)
    language = (
        payload.language
        if payload and payload.language in {"en", "ar"}
        else current_user.language
    )
    patient_context = _build_patient_context_string(db, report.user_id)
    has_previous_analysis = (
        db.query(models.Analysis)
        .filter(models.Analysis.report_id == report.id)
        .first()
        is not None
    )

    try:
        ai_output = gemini_service.analyze_medical_report(
            file_bytes=file_bytes,
            mime_type=report.content_type or "application/pdf",
            original_filename=report.original_filename,
            language=language,
            patient_context=patient_context,
        )
    except gemini_service.GeminiServiceError as exc:
        # Preserve previous successful analysis if re-analysis fails!
        report.last_error_json = json.dumps(exc.error_detail, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise
    except HTTPException as exc:
        report.last_error_json = json.dumps({"message": {"ar": str(exc.detail), "en": str(exc.detail)}}, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise
    except Exception:
        fallback_err = gemini_service.GeminiServiceError("service_unavailable")
        report.last_error_json = json.dumps(fallback_err.error_detail, ensure_ascii=False)
        report.status = "analyzed" if has_previous_analysis else "error"
        db.commit()
        raise fallback_err

    analysis = models.Analysis(
        report_id=report.id,
        user_id=report.user_id,
        result_json=json.dumps(ai_output["result"], ensure_ascii=False),
        model_used=ai_output["model_used"],
    )
    db.add(analysis)
    report.status = "analyzed"
    report.last_error_json = None
    db.commit()
    db.refresh(report)

    return serialize_report(db, report)


@router.get("")
def list_reports(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """List all medical reports uploaded by the current user."""
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == current_user.id)
        .order_by(models.Report.uploaded_at.desc())
        .all()
    )
    return [serialize_report(db, r) for r in reports]


@router.get("/{report_id}")
def get_report(
    report_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if not _can_access_report(db, current_user, report):
        raise HTTPException(status_code=403, detail="Access denied.")
    return serialize_report(db, report)


@router.get("/{report_id}/file")
def download_report_file(
    report_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the stored PDF or image file for preview or download."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if not _can_access_report(db, current_user, report):
        raise HTTPException(status_code=403, detail="Access denied.")

    if report.status == "demo_sample":
        raise HTTPException(
            status_code=404,
            detail="This is a fictional demonstration metadata entry without an uploaded binary file.",
        )
    path = file_service.get_file_path(report.filename, settings.UPLOAD_DIR)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk.")

    return FileResponse(
        path=str(path),
        media_type=report.content_type or "application/octet-stream",
        filename=report.original_filename,
    )


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(models.Report)
        .filter(models.Report.id == report_id, models.Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    db.query(models.Analysis).filter(models.Analysis.report_id == report.id).delete()
    filename = report.filename
    db.delete(report)
    db.commit()

    file_service.delete_file(filename, settings.UPLOAD_DIR)
    return {"deleted": True, "id": report_id}
