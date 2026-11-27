import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_role
from app.database import get_db

router = APIRouter(prefix="/api/forum", tags=["doctor-forum"])


def _serialize_forum_post(db: Session, post: models.ForumPost, current_user_id: int) -> Dict[str, Any]:
    comments = (
        db.query(models.ForumComment)
        .filter(models.ForumComment.post_id == post.id)
        .order_by(models.ForumComment.created_at.asc())
        .all()
    )
    upvotes = db.query(models.ForumUpvote).filter(models.ForumUpvote.post_id == post.id).all()
    user_upvoted = any(u.user_id == current_user_id for u in upvotes)
    # Seeded demo posts carry an illustrative baseline count offset if desired, or actual user upvotes
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": post.author_name,
        "specialty_id": post.specialty_id,
        "title": post.title,
        "title_ar": post.title_ar,
        "presentation": post.presentation,
        "presentation_ar": post.presentation_ar,
        "protocol": post.protocol,
        "protocol_ar": post.protocol_ar,
        "tags": json.loads(post.tags_json or "[]"),
        "is_demo": post.is_demo,
        "is_owner": post.author_id == current_user_id and not post.is_demo,
        "upvotes_count": len(upvotes),
        "user_upvoted": user_upvoted,
        "created_at": post.created_at,
        "comments": [
            {
                "id": c.id,
                "author_id": c.author_id,
                "author_name": c.author_name,
                "body": c.body,
                "body_ar": c.body_ar,
                "is_best_approach": c.is_best_approach,
                "is_demo": c.is_demo,
                "created_at": c.created_at,
            }
            for c in comments
        ],
    }


@router.get("/posts")
def list_forum_posts(
    specialty_id: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    posts = db.query(models.ForumPost).order_by(models.ForumPost.created_at.desc()).all()
    search = (q or "").strip().lower()
    out = []
    for p in posts:
        if specialty_id and specialty_id != "all" and p.specialty_id != specialty_id:
            continue
        if search:
            hay = f"{p.title} {p.title_ar or ''} {p.presentation} {p.presentation_ar or ''} {p.author_name}".lower()
            if search not in hay:
                continue
        out.append(_serialize_forum_post(db, p, current_user.id))
    return out


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_forum_post(
    payload: schemas.ForumPostCreate,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = models.ForumPost(
        author_id=current_user.id,
        author_name=current_user.full_name,
        specialty_id=payload.specialty_id,
        title=payload.title.strip(),
        presentation=payload.presentation.strip(),
        protocol=(payload.protocol or "").strip() or None,
        tags_json=json.dumps([t.strip() for t in payload.tags if t.strip()]),
        is_demo=False,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_forum_post(db, post, current_user.id)


@router.put("/posts/{post_id}")
def update_forum_post(
    post_id: int,
    payload: schemas.ForumPostUpdate,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.ForumPost).filter(models.ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Forum post not found.")
    if post.author_id != current_user.id or post.is_demo:
        raise HTTPException(status_code=403, detail="You can only edit your own forum posts.")

    if payload.title is not None:
        post.title = payload.title.strip()
    if payload.presentation is not None:
        post.presentation = payload.presentation.strip()
    if payload.protocol is not None:
        post.protocol = payload.protocol.strip() or None
    if payload.specialty_id is not None:
        post.specialty_id = payload.specialty_id
    if payload.tags is not None:
        post.tags_json = json.dumps([t.strip() for t in payload.tags if t.strip()])
    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)
    return _serialize_forum_post(db, post, current_user.id)


@router.delete("/posts/{post_id}")
def delete_forum_post(
    post_id: int,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    post = db.query(models.ForumPost).filter(models.ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Forum post not found.")
    if post.author_id != current_user.id or post.is_demo:
        raise HTTPException(status_code=403, detail="You can only delete your own forum posts.")

    db.query(models.ForumComment).filter(models.ForumComment.post_id == post.id).delete()
    db.query(models.ForumUpvote).filter(models.ForumUpvote.post_id == post.id).delete()
    db.delete(post)
    db.commit()
    return {"deleted": True, "id": post_id}


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def add_forum_comment(
    post_id: int,
    payload: schemas.ForumCommentCreate,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.ForumPost).filter(models.ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Forum post not found.")

    comment = models.ForumComment(
        post_id=post.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        body=payload.body.strip(),
        is_demo=False,
    )
    db.add(comment)
    db.commit()
    return _serialize_forum_post(db, post, current_user.id)


@router.post("/posts/{post_id}/upvote")
def toggle_forum_upvote(
    post_id: int,
    current_user: models.User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.query(models.ForumPost).filter(models.ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Forum post not found.")

    existing = (
        db.query(models.ForumUpvote)
        .filter(models.ForumUpvote.post_id == post.id, models.ForumUpvote.user_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(models.ForumUpvote(post_id=post.id, user_id=current_user.id))
    db.commit()
    return _serialize_forum_post(db, post, current_user.id)
