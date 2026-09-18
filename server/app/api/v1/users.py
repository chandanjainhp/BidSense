from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db_session
from app.schemas.user import UserPublic, UserUpdate, PasswordChangeRequest
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.security import verify_password, get_password_hash
import re

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserPublic)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile."""
    return UserPublic.model_validate(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_current_user(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile."""
    update_data = user_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.flush()
    await db.refresh(current_user)
    
    return UserPublic.model_validate(current_user)


@router.put("/me/password")
async def change_password(
    password_data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Change password - verify current password first."""
    # Verify current password
    if not verify_password(password_data.currentPassword, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    # Validate new password (same policy as registration)
    new_password = password_data.newPassword
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    if not re.search(r"[A-Z]", new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter",
        )
    if not re.search(r"\d", new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number",
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    await db.flush()
    
    return {"message": "Password changed successfully"}


@router.post("/me/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Upload user avatar."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if avatar.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}",
        )
    
    # Validate file size (10MB max)
    contents = await avatar.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )
    
    # In production, save to S3; for now, save locally
    import os
    import uuid as uuid_lib
    from app.core.config import settings
    
    file_ext = avatar.filename.split(".")[-1] if "." in avatar.filename else "jpg"
    filename = f"{uuid_lib.uuid4()}.{file_ext}"
    filepath = os.path.join(settings.MEDIA_ROOT, "avatars", filename)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update user avatar URL
    current_user.avatar_url = f"/media/avatars/{filename}"
    await db.flush()
    
    return {"avatar_url": current_user.avatar_url}
