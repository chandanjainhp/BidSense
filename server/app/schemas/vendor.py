from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from datetime import datetime
from enum import Enum


class VendorStatusEnum(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


class VendorBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    industry: str | None = Field(None, max_length=80)
    website: str | None = None
    contact_name: str | None = Field(None, max_length=120)
    email: EmailStr
    phone: str | None = None
    status: VendorStatusEnum = VendorStatusEnum.PENDING
    notes: str | None = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    industry: str | None = Field(None, max_length=80)
    website: str | None = None
    contact_name: str | None = Field(None, max_length=120)
    email: EmailStr | None = None
    phone: str | None = None
    status: VendorStatusEnum | None = None
    notes: str | None = None


class VendorPublic(VendorBase):
    id: UUID
    owner_user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VendorListResponse(BaseModel):
    items: list[VendorPublic]
    total: int
    page: int
    page_size: int


class VendorMetrics(BaseModel):
    total: int
    active: int
    pending: int
    inactive: int
    industry_breakdown: dict[str, int]
