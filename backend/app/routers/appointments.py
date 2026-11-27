from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


def _serialize_appointment(db: Session, appt: models.Appointment) -> Dict[str, Any]:
    patient = db.query(models.User).filter(models.User.id == appt.patient_id).first()
    doctor = db.query(models.User).filter(models.User.id == appt.doctor_id).first()
    doc_profile = (
        db.query(models.DoctorProfile)
        .filter(models.DoctorProfile.user_id == appt.doctor_id)
        .first()
    )
    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "patient_name": patient.full_name if patient else "Unknown Patient",
        "doctor_id": appt.doctor_id,
        "doctor_name": doctor.full_name if doctor else "Unknown Doctor",
        "doctor_specialty": doc_profile.specialty if doc_profile else None,
        "scheduled_at": appt.scheduled_at,
        "appointment_type": appt.appointment_type,
        "status": appt.status,
        "notes": appt.notes,
        "consultation_fee": appt.consultation_fee or (doc_profile.consultation_fee if doc_profile else "150 SAR"),
        "payment_method": appt.payment_method or "clinic",
        "payment_status": appt.payment_status or "pay_at_clinic",
        "created_at": appt.created_at,
    }


@router.get("")
def list_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    query = db.query(models.Appointment)
    if current_user.role == "doctor":
        query = query.filter(models.Appointment.doctor_id == current_user.id)
    else:
        query = query.filter(models.Appointment.patient_id == current_user.id)

    appts = query.order_by(models.Appointment.scheduled_at.asc()).all()
    return [_serialize_appointment(db, a) for a in appts]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: schemas.AppointmentCreate,
    current_user: models.User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    doctor = (
        db.query(models.User)
        .filter(models.User.id == payload.doctor_id, models.User.role == "doctor")
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor was not found.")

    try:
        scheduled_dt = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid scheduled_at datetime format. Expected ISO format.",
        )

    doc_profile = (
        db.query(models.DoctorProfile)
        .filter(models.DoctorProfile.user_id == doctor.id)
        .first()
    )
    payment_method = payload.payment_method if payload.payment_method in {"clinic", "card_sim", "paypal_sim"} else "clinic"
    payment_status = "pay_at_clinic" if payment_method == "clinic" else "simulated_demo_only"

    appt = models.Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        scheduled_at=scheduled_dt,
        appointment_type=payload.appointment_type,
        status="scheduled",
        notes=payload.notes,
        consultation_fee=doc_profile.consultation_fee if doc_profile else "150 SAR",
        payment_method=payment_method,
        payment_status=payment_status,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _serialize_appointment(db, appt)


@router.put("/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: schemas.AppointmentUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if current_user.id not in {appt.patient_id, appt.doctor_id}:
        raise HTTPException(status_code=403, detail="Access denied.")

    if payload.status is not None:
        allowed_statuses = {"scheduled", "confirmed", "completed", "cancelled"}
        if payload.status not in allowed_statuses:
            raise HTTPException(status_code=400, detail="Invalid appointment status.")
        if current_user.role == "patient" and payload.status not in {"cancelled"}:
            raise HTTPException(
                status_code=403,
                detail="Patients may only cancel appointments.",
            )
        appt.status = payload.status

    if payload.notes is not None:
        appt.notes = payload.notes

    if payload.scheduled_at is not None:
        try:
            appt.scheduled_at = datetime.fromisoformat(
                payload.scheduled_at.replace("Z", "+00:00")
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format.")

    db.commit()
    db.refresh(appt)
    return _serialize_appointment(db, appt)


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if current_user.id not in {appt.patient_id, appt.doctor_id}:
        raise HTTPException(status_code=403, detail="Access denied.")

    db.delete(appt)
    db.commit()
    return {"deleted": True, "id": appointment_id}
