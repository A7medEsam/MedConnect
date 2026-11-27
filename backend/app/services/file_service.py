import os
import re
import uuid
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, UploadFile, status

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


def sanitize_filename(filename: str) -> str:
    """Keep a safe alphanumeric/dot/dash/underscore suffix for storage."""
    base = Path(filename or "upload").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return cleaned[:100] or "upload"


def validate_upload(
    file: UploadFile, content: bytes, max_size: int
) -> Tuple[str, str]:
    """Validate file extension, content-type, and byte length."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, PNG, JPG, JPEG, WEBP.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > max_size:
        max_mb = round(max_size / (1024 * 1024), 1)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    content_type = file.content_type or ""
    if not content_type or content_type == "application/octet-stream":
        if ext == ".pdf":
            content_type = "application/pdf"
        elif ext == ".png":
            content_type = "image/png"
        elif ext == ".webp":
            content_type = "image/webp"
        else:
            content_type = "image/jpeg"
    elif content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{content_type}'. Allowed: PDF and images (PNG/JPG/WEBP).",
        )

    return ext, content_type


async def save_upload_file(
    file: UploadFile, upload_dir: str, max_size: int
) -> Tuple[str, str, int]:
    """Read, validate, and store an uploaded file safely on disk.

    Returns: (safe_filename, resolved_content_type, file_size)
    """
    content = await file.read()
    ext, content_type = validate_upload(file, content, max_size)

    target_dir = Path(upload_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    safe_original = sanitize_filename(file.filename or f"report{ext}")
    unique_name = f"{uuid.uuid4().hex}_{safe_original}"
    if not unique_name.lower().endswith(ext):
        unique_name = f"{unique_name}{ext}"

    destination = target_dir / unique_name
    with open(destination, "wb") as out_file:
        out_file.write(content)

    return unique_name, content_type, len(content)


def get_file_path(filename: str, upload_dir: str) -> Path:
    """Resolve and verify path inside upload_dir (prevents path traversal)."""
    base_dir = Path(upload_dir).resolve()
    candidate = (base_dir / Path(filename).name).resolve()
    if not str(candidate).startswith(str(base_dir)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path.",
        )
    return candidate


def read_file_bytes(filename: str, upload_dir: str) -> bytes:
    """Read stored file bytes from disk."""
    path = get_file_path(filename, upload_dir)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored file not found on server.",
        )
    with open(path, "rb") as f:
        return f.read()


def delete_file(filename: str, upload_dir: str) -> None:
    """Delete a stored file from disk if it exists."""
    try:
        path = get_file_path(filename, upload_dir)
        if path.exists() and path.is_file():
            os.remove(path)
    except HTTPException:
        pass
