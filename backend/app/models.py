from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)  # "patient" or "doctor"
    language = Column(String(5), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth = Column(String(20))
    gender = Column(String(20))
    blood_type = Column(String(10))
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    phone = Column(String(30))
    emergency_contact = Column(String(100))
    medical_notes = Column(Text)


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialty = Column(String(100), default="General Medicine")
    specialty_id = Column(String(50), default="gp")
    location = Column(String(100), nullable=True)
    license_number = Column(String(60))
    clinic_name = Column(String(150))
    years_experience = Column(Integer, nullable=True)
    phone = Column(String(30))
    bio = Column(Text)
    consultation_fee = Column(String(50), default="150 SAR")
    verification_status = Column(String(30), default="unverified")  # unverified / pending / approved / rejected / demo
    verification_document = Column(String(255), nullable=True)
    verification_notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)


class Condition(Base):
    __tablename__ = "conditions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    status = Column(String(20), default="active")
    diagnosed_date = Column(String(20))
    notes = Column(Text)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    dosage = Column(String(50))
    frequency = Column(String(50))
    start_date = Column(String(20))
    notes = Column(Text)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    allergen = Column(String(100), nullable=False)
    severity = Column(String(20), default="mild")
    reaction = Column(String(200))
    notes = Column(Text)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vital(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vital_type = Column(String(30), nullable=False)
    value = Column(String(30), nullable=False)
    unit = Column(String(20))
    recorded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    is_demo = Column(Boolean, default=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(100))
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="uploaded")  # uploaded / analyzing / analyzed / error / demo_sample
    last_error_json = Column(Text, nullable=True)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    result_json = Column(Text)
    model_used = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    content_en = Column(Text, nullable=True)
    content_ar = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    appointment_type = Column(String(50), default="general")
    status = Column(String(20), default="scheduled")
    notes = Column(Text)
    consultation_fee = Column(String(50), nullable=True)
    payment_method = Column(String(30), default="clinic")  # clinic / card_sim / paypal_sim
    payment_status = Column(String(30), default="pay_at_clinic")  # pay_at_clinic / simulated_demo_only
    created_at = Column(DateTime, default=datetime.utcnow)


class SharedAccess(Base):
    __tablename__ = "shared_access"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="active")


# ---------- Restored Clinical Knowledge Tables ----------

class Specialty(Base):
    __tablename__ = "specialties"

    id = Column(String(50), primary_key=True)
    name_en = Column(String(120), nullable=False)
    name_ar = Column(String(120), nullable=False)
    icon = Column(String(50), default="Stethoscope")
    color = Column(String(80), default="from-teal-500 to-emerald-600")
    is_surgical = Column(Boolean, default=False)


class Guideline(Base):
    __tablename__ = "guidelines"

    code = Column(String(20), primary_key=True)
    name_en = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    color = Column(String(100), default="border-slate-300 bg-slate-50 text-slate-700")


class ClinicalReference(Base):
    __tablename__ = "clinical_references"

    id = Column(String(20), primary_key=True)
    title_en = Column(String(300), nullable=False)
    title_ar = Column(String(300), nullable=False)
    source_en = Column(String(200), nullable=False)
    source_ar = Column(String(200), nullable=False)
    specialty_id = Column(String(50), nullable=False)
    guidelines_json = Column(Text, default="[]")
    summary_en = Column(Text, nullable=False)
    summary_ar = Column(Text, nullable=False)
    url = Column(String(500), nullable=False)
    year = Column(String(20), nullable=True)
    last_updated = Column(String(20), nullable=True)
    verification_status = Column(String(80), default="Original reference, not independently verified")
    is_demo = Column(Boolean, default=True)


class SurgicalTip(Base):
    __tablename__ = "surgical_tips"

    id = Column(String(30), primary_key=True)
    title_en = Column(String(300), nullable=False)
    title_ar = Column(String(300), nullable=False)
    specialty_id = Column(String(50), nullable=False)
    tip_type = Column(String(30), default="trick")  # trick / video / protocol
    author_name_en = Column(String(150), nullable=False)
    author_name_ar = Column(String(150), nullable=False)
    excerpt_en = Column(Text, nullable=False)
    excerpt_ar = Column(Text, nullable=False)
    steps_json = Column(Text, default="[]")
    reference_url = Column(String(500), nullable=True)
    duration = Column(String(20), nullable=True)
    upvotes = Column(Integer, default=0)
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TipBookmark(Base):
    __tablename__ = "tip_bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "tip_id", name="uq_user_tip_bookmark"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tip_id = Column(String(30), ForeignKey("surgical_tips.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MentorSample(Base):
    __tablename__ = "mentor_samples"

    id = Column(String(30), primary_key=True)  # ctg / ecg / bloodTest
    title_en = Column(String(250), nullable=False)
    title_ar = Column(String(250), nullable=False)
    report_type_en = Column(String(200), nullable=False)
    report_type_ar = Column(String(200), nullable=False)
    sample_json = Column(Text, nullable=False)
    is_demo = Column(Boolean, default=True)


class MentorAnalysis(Base):
    __tablename__ = "mentor_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    report_type = Column(String(30), default="auto")
    original_filename = Column(String(255), nullable=False)
    result_json = Column(Text, nullable=False)
    model_used = Column(String(50))
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------- Doctor Forum & Patient Community ----------

class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    seed_key = Column(String(30), unique=True, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=False)
    specialty_id = Column(String(50), default="gp")
    title = Column(String(300), nullable=False)
    title_ar = Column(String(300), nullable=True)
    presentation = Column(Text, nullable=False)
    presentation_ar = Column(Text, nullable=True)
    protocol = Column(Text, nullable=True)
    protocol_ar = Column(Text, nullable=True)
    tags_json = Column(Text, default="[]")
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ForumComment(Base):
    __tablename__ = "forum_comments"

    id = Column(Integer, primary_key=True, index=True)
    seed_key = Column(String(30), unique=True, nullable=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=False)
    body = Column(Text, nullable=False)
    body_ar = Column(Text, nullable=True)
    is_best_approach = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ForumUpvote(Base):
    __tablename__ = "forum_upvotes"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_upvote"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    seed_key = Column(String(30), unique=True, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=False)
    author_role = Column(String(20), default="patient")
    channel_id = Column(String(50), default="gp")
    post_type = Column(String(30), default="discussion")  # discussion / question / article / video
    title = Column(String(300), nullable=False)
    title_ar = Column(String(300), nullable=True)
    body = Column(Text, nullable=False)
    body_ar = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    report_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    seed_key = Column(String(30), unique=True, nullable=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=False)
    author_role = Column(String(20), default="patient")
    body = Column(Text, nullable=False)
    body_ar = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommunityLike(Base):
    __tablename__ = "community_likes"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_community_like"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommunityFlag(Base):
    __tablename__ = "community_flags"
    __table_args__ = (UniqueConstraint("post_id", "reporter_id", name="uq_community_flag"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------- Secure Temporary QR Access ----------

class QrAccessToken(Base):
    __tablename__ = "qr_access_tokens"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    token_hint = Column(String(12), nullable=False)  # first chars for display only
    scope_json = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QrAccessLog(Base):
    __tablename__ = "qr_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("qr_access_tokens.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(30), nullable=False)  # granted / denied_expired / denied_revoked
    accessed_at = Column(DateTime, default=datetime.utcnow)
