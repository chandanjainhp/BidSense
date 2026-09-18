from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from decimal import Decimal
from enum import Enum


class ProposalStatusEnum(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    SCORED = "scored"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"


class ProposalBase(BaseModel):
    amount: Decimal | None = None
    status: ProposalStatusEnum = ProposalStatusEnum.PENDING


class ProposalCreate(ProposalBase):
    rfp_id: UUID
    vendor_id: UUID


class ProposalUpdate(BaseModel):
    amount: Decimal | None = None
    status: ProposalStatusEnum | None = None


class ProposalPublic(BaseModel):
    id: UUID
    rfp_id: UUID
    vendor_id: UUID
    vendor_name: str | None = None
    rfp_title: str | None = None
    amount: float | None = None
    status: str
    ai_score: float | None = None
    ai_summary: str | None = None
    technical_score: float | None = None
    pricing_score: float | None = None
    experience_score: float | None = None
    document_url: str | None = None
    submitted_at: datetime
    scored_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProposalListResponse(BaseModel):
    items: list[ProposalPublic]
    total: int
    page: int
    page_size: int


class ProposalComparisonItem(BaseModel):
    id: UUID
    vendor_name: str
    amount: float | None = None
    ai_score: float | None = None
    technical_score: float | None = None
    pricing_score: float | None = None
    experience_score: float | None = None
    ai_summary: str | None = None


class ProposalComparisonResponse(BaseModel):
    proposals: list[ProposalComparisonItem]


class ScoreProposalRequest(BaseModel):
    rubric: dict | None = None
