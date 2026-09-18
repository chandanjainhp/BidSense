from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from datetime import datetime
from enum import Enum
import re


class UserPublic(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    avatar_url: str | None = None
    is_verified: bool = False
    last_login_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    avatar_url: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_policy(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain one uppercase letter and one number")
        return v


class DigestFrequencyEnum(str, Enum):
    INSTANT = "instant"
    DAILY = "daily"
    WEEKLY = "weekly"


class AiToneEnum(str, Enum):
    FORMAL = "formal"
    BALANCED = "balanced"
    CONCISE = "concise"


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = False
    digest_frequency: DigestFrequencyEnum = DigestFrequencyEnum.INSTANT


class AiPreferences(BaseModel):
    ai_tone: AiToneEnum = AiToneEnum.BALANCED
    ai_auto_score: bool = True
    ai_suggestions: bool = True


class UserSettingsPublic(BaseModel):
    notification_settings: NotificationSettings
    ai_preferences: AiPreferences

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    avatar_url: str | None = None


class NotificationSettingsUpdate(BaseModel):
    email_notifications: bool | None = None
    push_notifications: bool | None = None
    digest_frequency: DigestFrequencyEnum | None = None


class AiPreferencesUpdate(BaseModel):
    ai_tone: AiToneEnum | None = None
    ai_auto_score: bool | None = None
    ai_suggestions: bool | None = None


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)
