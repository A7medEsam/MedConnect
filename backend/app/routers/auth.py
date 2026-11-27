from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new patient or doctor account with isolated initial profile."""
    role = payload.role.strip().lower()
    if role not in {"patient", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'patient' or 'doctor'.",
        )

    username = payload.username.strip()
    email = payload.email.strip().lower()

    existing_user = (
        db.query(models.User)
        .filter((models.User.username == username) | (models.User.email == email))
        .first()
    )
    if existing_user:
        if existing_user.username == username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    user = models.User(
        username=username,
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=role,
        language=payload.language if payload.language in {"en", "ar"} else "en",
    )
    db.add(user)
    db.flush()

    if role == "patient":
        db.add(models.PatientProfile(user_id=user.id))
    else:
        db.add(models.DoctorProfile(user_id=user.id, specialty="General Medicine"))

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate by username or email and return JWT access token."""
    identifier = payload.username.strip()
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == identifier)
            | (models.User.email == identifier.lower())
        )
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return the currently authenticated user's account info."""
    return current_user


@router.put("/language", response_model=schemas.UserOut)
def update_language(
    payload: schemas.LanguageUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist the user's preferred UI/AI language ('en' or 'ar')."""
    if payload.language not in {"en", "ar"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Language must be 'en' or 'ar'.",
        )
    current_user.language = payload.language
    db.commit()
    db.refresh(current_user)
    return current_user
