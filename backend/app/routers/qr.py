import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_role
from app.config import get_settings
from app.database import get_db
from app.routers.reports import serialize_report
from app.services import file_service

router = APIRouter(prefix="/api/qr", tags=["qr-access"])
settings = get_settings()

ALLOWED_SCOPES = {"profile", "conditions", "medications", "allergies", "vitals", "reports"}


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _token_status(tok: models.QrAccessToken) -> str:
    if not tok.is_active or tok.revoked_at is not None:
        return "revoked"
    if tok.expires_at <= datetime.utcnow():
        return "expired"
    return "active"


def _validate_qr_token_for_doctor(db: Session, raw_token: str, doctor_id: int) -> models.QrAccessToken:
    tok_hash = _hash_token(raw_token.strip())
    tok = db.query(models.QrAccessToken).filter(models.QrAccessToken.token_hash == tok_hash).first()
    if not tok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR access code.")

    if not tok.is_active or tok.revoked_at is not None:
        db.add(models.QrAccessLog(token_id=tok.id, doctor_id=doctor_id, action="denied_revoked"))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This QR access code has been revoked by the patient.")

    if tok.expires_at <= datetime.utcnow():
        db.add(models.QrAccessLog(token_id=tok.id, doctor_id=doctor_id, action="denied_expired"))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This QR access code has expired.")

    return tok


@router.post("/tokens", status_code=status.HTTP_201_CREATED)
def create_qr_token(
    payload: schemas.QrCreateRequest,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Generate a cryptographically random temporary QR access token; store only its SHA-256 hash."""
    clean_scope = [s for s in payload.scope if s in ALLOWED_SCOPES]
    if not clean_scope:
        raise HTTPException(status_code=400, detail="Select at least one record scope to share.")

    raw_token = f"MC-{secrets.token_urlsafe(24)}"
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=payload.expires_minutes)

    row = models.QrAccessToken(
        patient_id=current_user.id,
        token_hash=token_hash,
        token_hint=f"{raw_token[:8]}...",
        scope_json=json.dumps(clean_scope),
        expires_at=expires_at,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "access_token": raw_token,  # Shown once upon generation; never persisted in plaintext
        "token_hint": row.token_hint,
        "scope": clean_scope,
        "expires_at": row.expires_at,
        "status": "active",
    }


@router.get("/tokens")
def list_patient_qr_tokens(
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    tokens = (
        db.query(models.QrAccessToken)
        .filter(models.QrAccessToken.patient_id == current_user.id)
        .order_by(models.QrAccessToken.created_at.desc())
        .all()
    )
    out = []
    for tok in tokens:
        logs = (
            db.query(models.QrAccessLog)
            .filter(models.QrAccessLog.token_id == tok.id)
            .order_by(models.QrAccessLog.accessed_at.desc())
            .limit(10)
            .all()
        )
        log_entries = []
        for lg in logs:
            doc = db.query(models.User).filter(models.User.id == lg.doctor_id).first()
            log_entries.append({
                "id": lg.id,
                "doctor_name": doc.full_name if doc else "Doctor",
                "action": lg.action,
                "accessed_at": lg.accessed_at,
            })
        out.append({
            "id": tok.id,
            "token_hint": tok.token_hint,
            "scope": json.loads(tok.scope_json),
            "expires_at": tok.expires_at,
            "revoked_at": tok.revoked_at,
            "status": _token_status(tok),
            "created_at": tok.created_at,
            "logs": log_entries,
        })
    return out


@router.delete("/tokens/{token_id}")
def revoke_qr_token(
    token_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    tok = (
        db.query(models.QrAccessToken)
        .filter(models.QrAccessToken.id == token_id, models.QrAccessToken.patient_id == current_user.id)
        .first()
    )
    if not tok:
        raise HTTPException(status_code=404, detail="QR access token not found.")

    tok.is_active = False
    tok.revoked_at = datetime.utcnow()
    db.commit()
    return {"revoked": True, "id": token_id, "status": "revoked"}


@router.post("/access")
def redeem_qr_token(
    payload: schemas.QrAccessRequest,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Authenticated doctor redeems a temporary QR access token and receives only scoped patient data."""
    tok = _validate_qr_token_for_doctor(db, payload.token, current_user.id)
    scope = json.loads(tok.scope_json)

    patient = db.query(models.User).filter(models.User.id == tok.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient account no longer exists.")

    db.add(models.QrAccessLog(token_id=tok.id, doctor_id=current_user.id, action="granted"))
    db.commit()

    response: Dict[str, Any] = {
        "patient_name": patient.full_name,
        "scope": scope,
        "expires_at": tok.expires_at,
    }

    if "profile" in scope:
        prof = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == patient.id).first()
        response["profile"] = schemas.PatientProfileOut.model_validate(prof) if prof else None
    if "conditions" in scope:
        conds = db.query(models.Condition).filter(models.Condition.user_id == patient.id).all()
        response["conditions"] = [schemas.ConditionOut.model_validate(c) for c in conds]
    if "medications" in scope:
        meds = db.query(models.Medication).filter(models.Medication.user_id == patient.id).all()
        response["medications"] = [schemas.MedicationOut.model_validate(m) for m in meds]
    if "allergies" in scope:
        algs = db.query(models.Allergy).filter(models.Allergy.user_id == patient.id).all()
        response["allergies"] = [schemas.AllergyOut.model_validate(a) for a in algs]
    if "vitals" in scope:
        vits = db.query(models.Vital).filter(models.Vital.user_id == patient.id).order_by(models.Vital.recorded_at.desc()).all()
        response["vitals"] = [schemas.VitalOut.model_validate(v) for v in vits]
    if "reports" in scope:
        reps = db.query(models.Report).filter(models.Report.user_id == patient.id).order_by(models.Report.uploaded_at.desc()).all()
        response["reports"] = [serialize_report(db, r) for r in reps]

    return response


@router.get("/reports/{report_id}/file")
def download_qr_scoped_report(
    report_id: int,
    x_qr_token: str = Header(..., alias="X-QR-Token"),
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Allow an authenticated doctor with a valid QR token (and 'reports' scope) to download/preview a report."""
    tok = _validate_qr_token_for_doctor(db, x_qr_token, current_user.id)
    scope = json.loads(tok.scope_json)
    if "reports" not in scope:
        raise HTTPException(status_code=403, detail="This QR token does not grant access to medical reports.")

    report = (
        db.query(models.Report)
        .filter(models.Report.id == report_id, models.Report.user_id == tok.patient_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    path = file_service.get_file_path(report.filename, settings.UPLOAD_DIR)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file is unavailable on disk (demo placeholder or deleted).")

    return FileResponse(
        path=str(path),
        media_type=report.content_type or "application/octet-stream",
        filename=report.original_filename,
    )
