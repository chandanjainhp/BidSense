from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum


class NotificationTypeEnum(str, Enum):
    AI = "ai"
    RFP = "rfp"
    VENDOR = "vendor"
    SYSTEM = "system"


class NotificationCreate(BaseModel):
    notification_type: NotificationTypeEnum
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    related_rfp_id: UUID | None = None


class NotificationPublic(BaseModel):
    id: UUID
    user_id: UUID
    notification_type: str
    title: str
    body: str
    is_read: bool
    related_rfp_id: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationPublic]
    total: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    count: int


class MarkReadRequest(BaseModel):
    ids: list[UUID] | None = None
