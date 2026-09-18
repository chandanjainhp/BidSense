from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.db.base import get_db_session
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationPublic, NotificationListResponse, UnreadCountResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    unread: Optional[bool] = None,
    type_filter: Optional[str] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List notifications with filters."""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread is True:
        query = query.where(Notification.is_read == False)
    if type_filter:
        query = query.where(Notification.notification_type == type_filter)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return NotificationListResponse(
        items=[NotificationPublic.model_validate(n) for n in notifications],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get unread notification count."""
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    count = result.scalar() or 0
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await db.flush()
    
    return {"message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    
    return {"message": "All notifications marked as read"}
