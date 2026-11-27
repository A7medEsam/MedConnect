from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------- Auth ----------

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=4, max_length=128)
    role: str = Field(default="patient")
    language: str = Field(default="en")


class UserLogin(BaseModel):
    username: str
    password: str


class LanguageUpdate(BaseModel):
    language: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    language: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Patient Profile & Health Records ----------

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_notes: Optional[str] = None


class PatientProfileOut(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_notes: Optional[str] = None

    class Config:
        from_attributes = True


class ConditionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    status: str = Field(default="active")
    diagnosed_date: Optional[str] = None
    notes: Optional[str] = None


class ConditionOut(BaseModel):
    id: int
    user_id: int
    name: str
    status: str
    diagnosed_date: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    notes: Optional[str] = None


class MedicationOut(BaseModel):
    id: int
    user_id: int
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AllergyCreate(BaseModel):
    allergen: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(default="mild")
    reaction: Optional[str] = None
    notes: Optional[str] = None


class AllergyOut(BaseModel):
    id: int
    user_id: int
    allergen: str
    severity: str
    reaction: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VitalCreate(BaseModel):
    vital_type: str = Field(..., min_length=1, max_length=30)
    value: str = Field(..., min_length=1, max_length=30)
    unit: Optional[str] = None
    notes: Optional[str] = None


class VitalOut(BaseModel):
    id: int
    user_id: int
    vital_type: str
    value: str
    unit: Optional[str] = None
    recorded_at: datetime
    notes: Optional[str] = None
    is_demo: bool

    class Config:
        from_attributes = True


class ShareRequest(BaseModel):
    doctor_id: int


# ---------- Doctor Profile & Verification ----------

class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    specialty_id: Optional[str] = None
    location: Optional[str] = None
    license_number: Optional[str] = None
    clinic_name: Optional[str] = None
    years_experience: Optional[int] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[str] = None


class DoctorProfileOut(BaseModel):
    id: int
    user_id: int
    specialty: Optional[str] = None
    specialty_id: Optional[str] = None
    location: Optional[str] = None
    license_number: Optional[str] = None
    clinic_name: Optional[str] = None
    years_experience: Optional[int] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[str] = None
    verification_status: str = "unverified"
    verification_document: Optional[str] = None
    verification_notes: Optional[str] = None
    is_demo: bool = False

    class Config:
        from_attributes = True


# ---------- Reports & AI Analysis ----------

class AnalyzeRequest(BaseModel):
    language: Optional[str] = None


class AnalysisOut(BaseModel):
    id: int
    report_id: int
    user_id: int
    result: Optional[Dict[str, Any]] = None
    model_used: Optional[str] = None
    created_at: datetime


class ReportOut(BaseModel):
    id: int
    user_id: int
    filename: str
    original_filename: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime
    status: str
    analysis: Optional[AnalysisOut] = None


# ---------- Chat ----------

class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=6000)
    language: Optional[str] = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    content_en: Optional[str] = None
    content_ar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Appointments ----------

class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_at: str
    appointment_type: str = Field(default="general")
    notes: Optional[str] = None
    payment_method: str = Field(default="clinic")  # clinic / card_sim / paypal_sim


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    scheduled_at: Optional[str] = None


# ---------- Forum & Community ----------

class ForumPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    presentation: str = Field(..., min_length=5)
    protocol: Optional[str] = None
    specialty_id: str = Field(default="gp")
    tags: List[str] = Field(default_factory=list)


class ForumPostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=300)
    presentation: Optional[str] = None
    protocol: Optional[str] = None
    specialty_id: Optional[str] = None
    tags: Optional[List[str]] = None


class ForumCommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=3000)


class CommunityPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    body: str = Field(..., min_length=5)
    channel_id: str = Field(default="gp")
    post_type: str = Field(default="discussion")


class CommunityPostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=300)
    body: Optional[str] = Field(default=None, min_length=5)
    channel_id: Optional[str] = None
    post_type: Optional[str] = None


class CommunityCommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=3000)


class CommunityFlagCreate(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


# ---------- QR Temporary Access ----------

class QrCreateRequest(BaseModel):
    scope: List[str] = Field(default_factory=lambda: ["profile", "conditions", "medications", "allergies", "vitals"])
    expires_minutes: int = Field(default=60, ge=5, le=1440)


class QrAccessRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=256)
