from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_role
from app.config import get_settings
from app.database import get_db
from app.routers.reports import serialize_report
from app.services import file_service

router = APIRouter(prefix="/api/doctor", tags=["doctor"])
settings = get_settings()


def _get_or_create_doc_profile(db: Session, user_id: int) -> models.DoctorProfile:
    doc_profile = (
        db.query(models.DoctorProfile)
        .filter(models.DoctorProfile.user_id == user_id)
        .first()
    )
    if not doc_profile:
        doc_profile = models.DoctorProfile(user_id=user_id, specialty="General Medicine")
        db.add(doc_profile)
        db.commit()
        db.refresh(doc_profile)
    return doc_profile


@router.get("/profile")
def get_doctor_profile(
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    doc_profile = _get_or_create_doc_profile(db, current_user.id)
    return {
        "user": schemas.UserOut.model_validate(current_user),
        "profile": schemas.DoctorProfileOut.model_validate(doc_profile),
    }


@router.put("/profile")
def update_doctor_profile(
    payload: schemas.DoctorProfileUpdate,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    doc_profile = _get_or_create_doc_profile(db, current_user.id)
    data = payload.model_dump(exclude_unset=True)

    if "full_name" in data and data["full_name"]:
        current_user.full_name = data.pop("full_name").strip()
    else:
        data.pop("full_name", None)

    allowed_fields = {
        "specialty",
        "specialty_id",
        "location",
        "license_number",
        "clinic_name",
        "years_experience",
        "phone",
        "bio",
        "consultation_fee",
    }
    for field, value in data.items():
        if field in allowed_fields and hasattr(doc_profile, field):
            setattr(doc_profile, field, value)

    db.commit()
    db.refresh(current_user)
    db.refresh(doc_profile)
    return {
        "user": schemas.UserOut.model_validate(current_user),
        "profile": schemas.DoctorProfileOut.model_validate(doc_profile),
    }


@router.post("/verification")
async def submit_doctor_verification(
    file: UploadFile = File(...),
    license_number: str = Form(...),
    specialty: str = Form(default="General Medicine"),
    clinic_name: str = Form(default=""),
    years_experience: Optional[int] = Form(default=None),
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Upload a physician license/certificate and mark status as 'pending' review (never auto-approves)."""
    safe_filename, _, _ = await file_service.save_upload_file(
        file=file,
        upload_dir=settings.UPLOAD_DIR,
        max_size=settings.MAX_UPLOAD_SIZE,
    )
    doc_profile = _get_or_create_doc_profile(db, current_user.id)

    if doc_profile.verification_document:
        file_service.delete_file(doc_profile.verification_document, settings.UPLOAD_DIR)

    doc_profile.license_number = license_number.strip()
    if specialty.strip():
        doc_profile.specialty = specialty.strip()
    if clinic_name.strip():
        doc_profile.clinic_name = clinic_name.strip()
    if years_experience is not None:
        doc_profile.years_experience = years_experience
    doc_profile.verification_document = safe_filename
    doc_profile.verification_status = "pending"
    doc_profile.verification_notes = (
        "Submitted for manual credential review. Real accounts are not auto-approved."
    )

    db.commit()
    db.refresh(doc_profile)
    return {
        "user": schemas.UserOut.model_validate(current_user),
        "profile": schemas.DoctorProfileOut.model_validate(doc_profile),
    }


@router.get("/verification/file")
def get_verification_document(
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    doc_profile = _get_or_create_doc_profile(db, current_user.id)
    if not doc_profile.verification_document:
        raise HTTPException(status_code=404, detail="No verification document uploaded.")
    path = file_service.get_file_path(doc_profile.verification_document, settings.UPLOAD_DIR)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Verification file not found on disk.")
    return FileResponse(path=str(path), filename=doc_profile.verification_document)


@router.get("/patients")
def list_shared_patients(
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return only patients who have granted active SharedAccess to this doctor."""
    shares = (
        db.query(models.SharedAccess)
        .filter(
            models.SharedAccess.doctor_id == current_user.id,
            models.SharedAccess.status == "active",
        )
        .all()
    )

    patients_list: List[Dict[str, Any]] = []
    for share in shares:
        patient = (
            db.query(models.User)
            .filter(models.User.id == share.patient_id, models.User.role == "patient")
            .first()
        )
        if not patient:
            continue
        profile = (
            db.query(models.PatientProfile)
            .filter(models.PatientProfile.user_id == patient.id)
            .first()
        )
        conditions_count = (
            db.query(models.Condition).filter(models.Condition.user_id == patient.id).count()
        )
        meds_count = (
            db.query(models.Medication).filter(models.Medication.user_id == patient.id).count()
        )
        reports_count = (
            db.query(models.Report).filter(models.Report.user_id == patient.id).count()
        )
        latest_vital = (
            db.query(models.Vital)
            .filter(models.Vital.user_id == patient.id)
            .order_by(models.Vital.recorded_at.desc())
            .first()
        )

        patients_list.append(
            {
                "id": patient.id,
                "username": patient.username,
                "full_name": patient.full_name,
                "email": patient.email,
                "shared_since": share.created_at,
                "gender": profile.gender if profile else None,
                "date_of_birth": profile.date_of_birth if profile else None,
                "blood_type": profile.blood_type if profile else None,
                "conditions_count": conditions_count,
                "medications_count": meds_count,
                "reports_count": reports_count,
                "latest_vital": (
                    schemas.VitalOut.model_validate(latest_vital) if latest_vital else None
                ),
            }
        )

    return patients_list


@router.get("/patients/{patient_id}")
def get_shared_patient_detail(
    patient_id: int,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return full health profile and reports for a shared patient."""
    share = (
        db.query(models.SharedAccess)
        .filter(
            models.SharedAccess.doctor_id == current_user.id,
            models.SharedAccess.patient_id == patient_id,
            models.SharedAccess.status == "active",
        )
        .first()
    )
    if not share:
        raise HTTPException(
            status_code=403,
            detail="You do not have active sharing permission for this patient.",
        )

    patient = (
        db.query(models.User)
        .filter(models.User.id == patient_id, models.User.role == "patient")
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    profile = (
        db.query(models.PatientProfile)
        .filter(models.PatientProfile.user_id == patient.id)
        .first()
    )
    conditions = (
        db.query(models.Condition)
        .filter(models.Condition.user_id == patient.id)
        .order_by(models.Condition.created_at.desc())
        .all()
    )
    medications = (
        db.query(models.Medication)
        .filter(models.Medication.user_id == patient.id)
        .order_by(models.Medication.created_at.desc())
        .all()
    )
    allergies = (
        db.query(models.Allergy)
        .filter(models.Allergy.user_id == patient.id)
        .order_by(models.Allergy.created_at.desc())
        .all()
    )
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.user_id == patient.id)
        .order_by(models.Vital.recorded_at.desc())
        .all()
    )
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == patient.id)
        .order_by(models.Report.uploaded_at.desc())
        .all()
    )

    return {
        "patient": schemas.UserOut.model_validate(patient),
        "profile": schemas.PatientProfileOut.model_validate(profile) if profile else None,
        "conditions": [schemas.ConditionOut.model_validate(c) for c in conditions],
        "medications": [schemas.MedicationOut.model_validate(m) for m in medications],
        "allergies": [schemas.AllergyOut.model_validate(a) for a in allergies],
        "vitals": [schemas.VitalOut.model_validate(v) for v in vitals],
        "reports": [serialize_report(db, r) for r in reports],
    }
