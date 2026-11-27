import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/api/clinical", tags=["clinical"])


def _serialize_ref(ref: models.ClinicalReference) -> Dict[str, Any]:
    return {
        "id": ref.id,
        "title_en": ref.title_en,
        "title_ar": ref.title_ar,
        "source_en": ref.source_en,
        "source_ar": ref.source_ar,
        "specialty_id": ref.specialty_id,
        "guidelines": json.loads(ref.guidelines_json or "[]"),
        "summary_en": ref.summary_en,
        "summary_ar": ref.summary_ar,
        "url": ref.url,
        "year": ref.year,
        "last_updated": ref.last_updated,
        "verification_status": ref.verification_status,
        "is_demo": ref.is_demo,
    }


def _serialize_tip(tip: models.SurgicalTip, bookmarked_ids: set) -> Dict[str, Any]:
    return {
        "id": tip.id,
        "title_en": tip.title_en,
        "title_ar": tip.title_ar,
        "specialty_id": tip.specialty_id,
        "tip_type": tip.tip_type,
        "author_name_en": tip.author_name_en,
        "author_name_ar": tip.author_name_ar,
        "excerpt_en": tip.excerpt_en,
        "excerpt_ar": tip.excerpt_ar,
        "steps": json.loads(tip.steps_json or "[]"),
        "reference_url": tip.reference_url,
        "duration": tip.duration,
        "upvotes": tip.upvotes,
        "is_bookmarked": tip.id in bookmarked_ids,
        "is_demo": tip.is_demo,
    }


@router.get("/specialties")
def list_specialties(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    rows = db.query(models.Specialty).all()
    return [
        {
            "id": s.id,
            "name_en": s.name_en,
            "name_ar": s.name_ar,
            "icon": s.icon,
            "color": s.color,
            "is_surgical": s.is_surgical,
        }
        for s in rows
    ]


@router.get("/guidelines")
def list_guidelines(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    rows = db.query(models.Guideline).all()
    return [
        {"code": g.code, "name_en": g.name_en, "name_ar": g.name_ar, "color": g.color}
        for g in rows
    ]


@router.get("/references")
def list_references(
    specialty_id: Optional[str] = Query(default=None),
    guideline: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    rows = db.query(models.ClinicalReference).all()
    results = []
    search = (q or "").strip().lower()
    for r in rows:
        if specialty_id and specialty_id != "all" and r.specialty_id != specialty_id:
            continue
        codes = json.loads(r.guidelines_json or "[]")
        if guideline and guideline != "all" and guideline not in codes:
            continue
        if search:
            haystack = f"{r.title_en} {r.title_ar} {r.source_en} {r.source_ar} {r.summary_en} {r.summary_ar} {' '.join(codes)}".lower()
            if search not in haystack:
                continue
        results.append(_serialize_ref(r))
    return results


@router.get("/surgical-tips")
def list_surgical_tips(
    specialty_id: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    bookmarked_only: bool = Query(default=False),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    bookmarked_ids = {
        b.tip_id
        for b in db.query(models.TipBookmark).filter(models.TipBookmark.user_id == current_user.id).all()
    }
    rows = db.query(models.SurgicalTip).all()
    search = (q or "").strip().lower()
    results = []
    for tip in rows:
        if specialty_id and specialty_id != "all" and tip.specialty_id != specialty_id:
            continue
        if bookmarked_only and tip.id not in bookmarked_ids:
            continue
        if search:
            haystack = f"{tip.title_en} {tip.title_ar} {tip.excerpt_en} {tip.excerpt_ar} {tip.author_name_en} {tip.author_name_ar}".lower()
            if search not in haystack:
                continue
        results.append(_serialize_tip(tip, bookmarked_ids))
    return results


@router.post("/surgical-tips/{tip_id}/bookmark")
def toggle_tip_bookmark(
    tip_id: str,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    tip = db.query(models.SurgicalTip).filter(models.SurgicalTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Surgical tip not found.")

    existing = (
        db.query(models.TipBookmark)
        .filter(models.TipBookmark.user_id == current_user.id, models.TipBookmark.tip_id == tip_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"tip_id": tip_id, "is_bookmarked": False}

    db.add(models.TipBookmark(user_id=current_user.id, tip_id=tip_id))
    db.commit()
    return {"tip_id": tip_id, "is_bookmarked": True}


@router.get("/bundle")
def get_public_educational_bundle(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return public educational clinical references, guidelines, specialties, tips, and demo mentor samples for offline caching."""
    specialties = list_specialties(db)
    guidelines = list_guidelines(db)
    references = [_serialize_ref(r) for r in db.query(models.ClinicalReference).all()]
    tips = [_serialize_tip(t, set()) for t in db.query(models.SurgicalTip).all()]
    samples = [
        {
            "id": s.id,
            "title_en": s.title_en,
            "title_ar": s.title_ar,
            "report_type_en": s.report_type_en,
            "report_type_ar": s.report_type_ar,
            "data": json.loads(s.sample_json),
            "is_demo": True,
        }
        for s in db.query(models.MentorSample).all()
    ]
    return {
        "specialties": specialties,
        "guidelines": guidelines,
        "references": references,
        "surgical_tips": tips,
        "mentor_samples": samples,
        "note": "Public educational content only — contains zero private patient data.",
    }
