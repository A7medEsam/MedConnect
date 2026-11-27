from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/community", tags=["patient-community"])


def _serialize_community_post(db: Session, post: models.CommunityPost, current_user_id: int) -> Dict[str, Any]:
    comments = (
        db.query(models.CommunityComment)
        .filter(models.CommunityComment.post_id == post.id)
        .order_by(models.CommunityComment.created_at.asc())
        .all()
    )
    likes = db.query(models.CommunityLike).filter(models.CommunityLike.post_id == post.id).all()
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": post.author_name,
        "author_role": post.author_role,
        "channel_id": post.channel_id,
        "post_type": post.post_type,
        "title": post.title,
        "title_ar": post.title_ar,
        "body": post.body,
        "body_ar": post.body_ar,
        "is_demo": post.is_demo,
        "is_owner": post.author_id == current_user_id and not post.is_demo,
        "likes_count": len(likes),
        "user_liked": any(l.user_id == current_user_id for l in likes),
        "report_count": post.report_count,
        "created_at": post.created_at,
        "comments": [
            {
                "id": c.id,
                "author_id": c.author_id,
                "author_name": c.author_name,
                "author_role": c.author_role,
                "body": c.body,
                "body_ar": c.body_ar,
                "is_demo": c.is_demo,
                "created_at": c.created_at,
            }
            for c in comments
        ],
    }


@router.get("/posts")
def list_community_posts(
    channel_id: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """List public educational and patient community posts (never exposes private health records)."""
    posts = db.query(models.CommunityPost).order_by(models.CommunityPost.created_at.desc()).all()
    search = (q or "").strip().lower()
    out = []
    for p in posts:
        if channel_id and channel_id != "all" and p.channel_id != channel_id:
            continue
        if search:
            hay = f"{p.title} {p.title_ar or ''} {p.body} {p.body_ar or ''} {p.author_name}".lower()
            if search not in hay:
                continue
        out.append(_serialize_community_post(db, p, current_user.id))
    return out


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_community_post(
    payload: schemas.CommunityPostCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = models.CommunityPost(
        author_id=current_user.id,
        author_name=current_user.full_name,
        author_role=current_user.role,
        channel_id=payload.channel_id,
        post_type=payload.post_type if payload.post_type in {"discussion", "question", "article"} else "discussion",
        title=payload.title.strip(),
        body=payload.body.strip(),
        is_demo=False,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_community_post(db, post, current_user.id)


@router.put("/posts/{post_id}")
def update_community_post(
    post_id: int,
    payload: schemas.CommunityPostUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")
    if post.author_id != current_user.id or post.is_demo:
        raise HTTPException(status_code=403, detail="You can only edit your own posts.")

    if payload.title is not None:
        cleaned_title = payload.title.strip()
        if len(cleaned_title) < 3:
            raise HTTPException(status_code=422, detail="Title must be at least 3 characters.")
        post.title = cleaned_title
    if payload.body is not None:
        cleaned_body = payload.body.strip()
        if len(cleaned_body) < 5:
            raise HTTPException(status_code=422, detail="Post body must be at least 5 characters.")
        post.body = cleaned_body
    if payload.channel_id is not None:
        post.channel_id = payload.channel_id
    if payload.post_type is not None and payload.post_type in {"discussion", "question", "article"}:
        post.post_type = payload.post_type
    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)
    return _serialize_community_post(db, post, current_user.id)


@router.delete("/posts/{post_id}")
def delete_community_post(
    post_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")
    if post.author_id != current_user.id or post.is_demo:
        raise HTTPException(status_code=403, detail="You can only delete your own posts.")

    db.query(models.CommunityComment).filter(models.CommunityComment.post_id == post.id).delete()
    db.query(models.CommunityLike).filter(models.CommunityLike.post_id == post.id).delete()
    db.query(models.CommunityFlag).filter(models.CommunityFlag.post_id == post.id).delete()
    db.delete(post)
    db.commit()
    return {"deleted": True, "id": post_id}


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def add_community_comment(
    post_id: int,
    payload: schemas.CommunityCommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")

    db.add(models.CommunityComment(
        post_id=post.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        author_role=current_user.role,
        body=payload.body.strip(),
        is_demo=False,
    ))
    db.commit()
    return _serialize_community_post(db, post, current_user.id)


@router.post("/posts/{post_id}/like")
def toggle_community_like(
    post_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")

    existing = (
        db.query(models.CommunityLike)
        .filter(models.CommunityLike.post_id == post.id, models.CommunityLike.user_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(models.CommunityLike(post_id=post.id, user_id=current_user.id))
    db.commit()
    return _serialize_community_post(db, post, current_user.id)


@router.post("/posts/{post_id}/report")
def report_community_post(
    post_id: int,
    payload: schemas.CommunityFlagCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")

    existing = (
        db.query(models.CommunityFlag)
        .filter(models.CommunityFlag.post_id == post.id, models.CommunityFlag.reporter_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already reported this post.")

    db.add(models.CommunityFlag(post_id=post.id, reporter_id=current_user.id, reason=payload.reason.strip()))
    post.report_count = (post.report_count or 0) + 1
    db.commit()
    return {"reported": True, "post_id": post.id, "report_count": post.report_count}
