import logging
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings, get_timeout_config, resolve_gemini_config
from app.database import init_db
from app.routers import (
    appointments,
    auth,
    chat,
    clinical,
    community,
    doctors,
    forum,
    mentor,
    patients,
    qr,
    reports,
)

logger = logging.getLogger("medconnect.api")
settings = get_settings()

app = FastAPI(
    title="MedConnect API",
    description="Bilingual Healthcare Platform Backend Prototype",
    version="1.0.0",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = f"mc-srv-{uuid.uuid4().hex[:8]}"
    logger.error("Unhandled backend exception [%s] on %s %s (%s)", req_id, request.method, request.url.path, type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "category": "service_unavailable",
                "message": {
                    "ar": "حدث خطأ داخلي مؤقت في الخادم. يرجى المحاولة مرة أخرى.",
                    "en": "A temporary server error occurred. Please try again.",
                },
                "retry_after_seconds": None,
                "retryable": True,
                "request_id": req_id,
            }
        },
    )


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(clinical.router)
app.include_router(mentor.router)
app.include_router(forum.router)
app.include_router(community.router)
app.include_router(qr.router)


@app.get("/")
@app.get("/api/health")
def health_check():
    api_key, model_name, google_key_present = resolve_gemini_config()
    chat_t, report_t, upload_t = get_timeout_config()
    return {
        "status": "ok",
        "app": "MedConnect API",
        "gemini_configured": bool(api_key),
        "gemini_model": model_name,
        "authoritative_key_var": "GEMINI_API_KEY",
        "google_api_key_ignored": google_key_present,
        "timeouts": {
            "health_seconds": 3,
            "upload_seconds": upload_t,
            "chat_seconds": chat_t,
            "report_seconds": report_t,
        },
    }
