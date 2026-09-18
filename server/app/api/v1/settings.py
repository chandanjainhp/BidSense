from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db_session
from app.models.settings import UserSettings, DigestFrequency, AiTone
from app.schemas.notification import NotificationTypeEnum
from app.core.dependencies import get_current_user
from app.models.user import User
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/settings", tags=["Settings"])


class NotificationSettings(BaseModel):
    emailNotifications: bool
    pushNotifications: bool
    digestFrequency: str


class AiPreferences(BaseModel):
    aiTone: str
    aiAutoScore: bool
    aiSuggestions: bool


async def get_or_create_settings(db: AsyncSession, user: User) -> UserSettings:
    """Get or create user settings."""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.flush()
    
    return settings


@router.get("/notifications", response_model=NotificationSettings)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get notification settings."""
    settings = await get_or_create_settings(db, current_user)
    
    return NotificationSettings(
        emailNotifications=settings.email_notifications,
        pushNotifications=settings.push_notifications,
        digestFrequency=settings.digest_frequency.value,
    )


@router.patch("/notifications", response_model=NotificationSettings)
async def update_notification_settings(
    settings_data: NotificationSettings,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update notification settings."""
    settings = await get_or_create_settings(db, current_user)
    
    settings.email_notifications = settings_data.emailNotifications
    settings.push_notifications = settings_data.pushNotifications
    
    # Map frequency string to enum
    freq_map = {
        "instant": DigestFrequency.INSTANT,
        "daily": DigestFrequency.DAILY,
        "weekly": DigestFrequency.WEEKLY,
    }
    settings.digest_frequency = freq_map.get(
        settings_data.digestFrequency, DigestFrequency.INSTANT
    )
    
    await db.flush()
    
    return NotificationSettings(
        emailNotifications=settings.email_notifications,
        pushNotifications=settings.push_notifications,
        digestFrequency=settings.digest_frequency.value,
    )


@router.get("/ai", response_model=AiPreferences)
async def get_ai_preferences(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get AI preferences."""
    settings = await get_or_create_settings(db, current_user)
    
    return AiPreferences(
        aiTone=settings.ai_tone.value,
        aiAutoScore=settings.ai_auto_score,
        aiSuggestions=settings.ai_suggestions,
    )


@router.patch("/ai", response_model=AiPreferences)
async def update_ai_preferences(
    settings_data: AiPreferences,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update AI preferences."""
    settings = await get_or_create_settings(db, current_user)
    
    # Map tone string to enum
    tone_map = {
        "formal": AiTone.FORMAL,
        "balanced": AiTone.BALANCED,
        "concise": AiTone.CONCISE,
    }
    settings.ai_tone = tone_map.get(settings_data.aiTone, AiTone.BALANCED)
    settings.ai_auto_score = settings_data.aiAutoScore
    settings.ai_suggestions = settings_data.aiSuggestions
    
    await db.flush()
    
    return AiPreferences(
        aiTone=settings.ai_tone.value,
        aiAutoScore=settings.ai_auto_score,
        aiSuggestions=settings.ai_suggestions,
    )
