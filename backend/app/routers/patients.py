from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_role
from app.database import get_db

router = APIRouter(prefix="/api/patient", tags=["patient"])


def _get_or_create_profile(db: Session, user_id: int) -> models.PatientProfile:
    profile = (
        db.query(models.PatientProfile)
        .filter(models.PatientProfile.user_id == user_id)
        .first()
    )
    if not profile:
        profile = models.PatientProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/profile")
def get_patient_profile(
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return the authenticated patient's complete isolated health profile."""
    profile = _get_or_create_profile(db, current_user.id)
    conditions = (
        db.query(models.Condition)
        .filter(models.Condition.user_id == current_user.id)
        .order_by(models.Condition.created_at.desc())
        .all()
    )
    medications = (
        db.query(models.Medication)
        .filter(models.Medication.user_id == current_user.id)
        .order_by(models.Medication.created_at.desc())
        .all()
    )
    allergies = (
        db.query(models.Allergy)
        .filter(models.Allergy.user_id == current_user.id)
        .order_by(models.Allergy.created_at.desc())
        .all()
    )
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.user_id == current_user.id)
        .order_by(models.Vital.recorded_at.desc())
        .all()
    )

    return {
        "user": schemas.UserOut.model_validate(current_user),
        "profile": schemas.PatientProfileOut.model_validate(profile),
        "conditions": [schemas.ConditionOut.model_validate(c) for c in conditions],
        "medications": [schemas.MedicationOut.model_validate(m) for m in medications],
        "allergies": [schemas.AllergyOut.model_validate(a) for a in allergies],
        "vitals": [schemas.VitalOut.model_validate(v) for v in vitals],
    }


@router.put("/profile")
def update_patient_profile(
    payload: schemas.PatientProfileUpdate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Update personal and health profile fields for the authenticated patient."""
    profile = _get_or_create_profile(db, current_user.id)
    data = payload.model_dump(exclude_unset=True)

    if "full_name" in data and data["full_name"]:
        current_user.full_name = data.pop("full_name").strip()
    else:
        data.pop("full_name", None)

    for field, value in data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    db.commit()
    db.refresh(current_user)
    db.refresh(profile)
    return {
        "user": schemas.UserOut.model_validate(current_user),
        "profile": schemas.PatientProfileOut.model_validate(profile),
    }


@router.post("/conditions", response_model=schemas.ConditionOut, status_code=status.HTTP_201_CREATED)
def add_condition(
    payload: schemas.ConditionCreate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = models.Condition(
        user_id=current_user.id,
        name=payload.name.strip(),
        status=payload.status,
        diagnosed_date=payload.diagnosed_date,
        notes=payload.notes,
        is_demo=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/conditions/{condition_id}")
def delete_condition(
    condition_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.Condition)
        .filter(
            models.Condition.id == condition_id,
            models.Condition.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Condition not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": condition_id}


@router.post("/medications", response_model=schemas.MedicationOut, status_code=status.HTTP_201_CREATED)
def add_medication(
    payload: schemas.MedicationCreate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = models.Medication(
        user_id=current_user.id,
        name=payload.name.strip(),
        dosage=payload.dosage,
        frequency=payload.frequency,
        start_date=payload.start_date,
        notes=payload.notes,
        is_demo=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/medications/{medication_id}")
def delete_medication(
    medication_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.Medication)
        .filter(
            models.Medication.id == medication_id,
            models.Medication.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Medication not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": medication_id}


@router.post("/allergies", response_model=schemas.AllergyOut, status_code=status.HTTP_201_CREATED)
def add_allergy(
    payload: schemas.AllergyCreate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = models.Allergy(
        user_id=current_user.id,
        allergen=payload.allergen.strip(),
        severity=payload.severity,
        reaction=payload.reaction,
        notes=payload.notes,
        is_demo=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/allergies/{allergy_id}")
def delete_allergy(
    allergy_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.Allergy)
        .filter(
            models.Allergy.id == allergy_id,
            models.Allergy.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Allergy not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": allergy_id}


@router.post("/vitals", response_model=schemas.VitalOut, status_code=status.HTTP_201_CREATED)
def add_vital(
    payload: schemas.VitalCreate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = models.Vital(
        user_id=current_user.id,
        vital_type=payload.vital_type.strip(),
        value=payload.value.strip(),
        unit=payload.unit,
        notes=payload.notes,
        is_demo=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/vitals/{vital_id}")
def delete_vital(
    vital_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.Vital)
        .filter(
            models.Vital.id == vital_id,
            models.Vital.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Vital reading not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": vital_id}


@router.get("/doctors")
def list_doctors_for_patient(
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """List all registered doctors and whether this patient currently shares records with them."""
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    active_shares = {
        s.doctor_id
        for s in db.query(models.SharedAccess)
        .filter(
            models.SharedAccess.patient_id == current_user.id,
            models.SharedAccess.status == "active",
        )
        .all()
    }

    results = []
    for doc in doctors:
        doc_profile = (
            db.query(models.DoctorProfile)
            .filter(models.DoctorProfile.user_id == doc.id)
            .first()
        )
        results.append(
            {
                "id": doc.id,
                "username": doc.username,
                "full_name": doc.full_name,
                "email": doc.email,
                "specialty": doc_profile.specialty if doc_profile else "General Medicine",
                "specialty_id": doc_profile.specialty_id if doc_profile else "gp",
                "location": doc_profile.location if doc_profile else None,
                "clinic_name": doc_profile.clinic_name if doc_profile else None,
                "years_experience": doc_profile.years_experience if doc_profile else None,
                "consultation_fee": doc_profile.consultation_fee if doc_profile else "150 SAR",
                "verification_status": doc_profile.verification_status if doc_profile else "unverified",
                "is_demo": doc_profile.is_demo if doc_profile else False,
                "is_shared": doc.id in active_shares,
            }
        )
    return results


@router.post("/share")
def share_records_with_doctor(
    payload: schemas.ShareRequest,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    """Grant or reactivate read access to this patient's records for a specific doctor."""
    doctor = (
        db.query(models.User)
        .filter(models.User.id == payload.doctor_id, models.User.role == "doctor")
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor account not found.")

    access = (
        db.query(models.SharedAccess)
        .filter(
            models.SharedAccess.patient_id == current_user.id,
            models.SharedAccess.doctor_id == doctor.id,
        )
        .first()
    )
    if access:
        access.status = "active"
    else:
        access = models.SharedAccess(
            patient_id=current_user.id,
            doctor_id=doctor.id,
            status="active",
        )
        db.add(access)

    db.commit()
    return {"shared": True, "doctor_id": doctor.id, "doctor_name": doctor.full_name}


@router.delete("/share/{doctor_id}")
def revoke_doctor_access(
    doctor_id: int,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    """Revoke a doctor's access to this patient's records."""
    access = (
        db.query(models.SharedAccess)
        .filter(
            models.SharedAccess.patient_id == current_user.id,
            models.SharedAccess.doctor_id == doctor_id,
        )
        .first()
    )
    if not access:
        raise HTTPException(status_code=404, detail="Sharing record not found.")

    access.status = "revoked"
    db.commit()
    return {"shared": False, "doctor_id": doctor_id}
