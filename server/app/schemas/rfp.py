from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime, date

from decimal import Decimal
from enum import Enum


class RfpStatusEnum(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    AWARDED = "awarded"
    CANCELLED = "cancelled"


class RfpBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    type: str = Field(min_length=1, max_length=60)
    department: str | None = Field(None, max_length=80)
    budget: Decimal | None = None
    dueDate: date
    description: str | None = None


class RfpCreate(RfpBase):
    pass


class RfpUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    type: str | None = Field(None, min_length=1, max_length=60)
    department: str | None = Field(None, max_length=80)
    budget: Decimal | None = None
    dueDate: date | None = None
    description: str | None = None
    status: RfpStatusEnum | None = None


class RfpDocumentUpdate(BaseModel):
    document: dict


class RfpPublic(BaseModel):
    id: UUID
    created_by: UUID | None
    title: str
    type: str | None = None
    department: str | None = None
    budget: float | None = None
    dueDate: date
    description: str | None = None
    status: str
    vendorCount: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _map_orm_fields(cls, data):
        """Map ORM attribute names (rfp_type/due_date) to API names (type/dueDate)."""
        if hasattr(data, "rfp_type"):
            if not hasattr(data, "type"):
                data.type = data.rfp_type
            if hasattr(data, "due_date") and not hasattr(data, "dueDate"):
                due = data.due_date
                data.dueDate = due.date() if isinstance(due, datetime) else due
        return data


class RfpListResponse(BaseModel):
    items: list[RfpPublic]
    total: int
    page: int
    page_size: int


class RfpSendRequest(BaseModel):
    vendor_ids: list[UUID]
    invitation_message: str | None = None


class RfpAnalytics(BaseModel):
    total_invitations: int
    viewed_count: int
    started_count: int
    submitted_count: int
    declined_count: int
    avg_bid_amount: float | None = None
    lowest_bid_amount: float | None = None
    highest_bid_amount: float | None = None


class RfpEventPublic(BaseModel):
    id: UUID
    rfp_id: UUID
    actor_type: str
    actor_name: str | None
    action: str
    detail: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RfpHistoryResponse(BaseModel):
    events: list[RfpEventPublic]


class InvitationStatusEnum(str, Enum):
    INVITED = "invited"
    VIEWED = "viewed"
    STARTED = "started"
    SUBMITTED = "submitted"
    DECLINED = "declined"


class RfpInvitationPublic(BaseModel):
    id: UUID
    rfp_id: UUID
    vendor_id: UUID
    vendor_name: str
    status: str
    invited_at: datetime
    viewed_at: datetime | None = None
    submitted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
