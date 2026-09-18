from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
import enum

from app.db.base import Base


class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    SCORED = "scored"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    rfp_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("rfps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[ProposalStatus] = mapped_column(
        SQLEnum(ProposalStatus, name="proposal_status", create_type=True),
        default=ProposalStatus.PENDING,
        nullable=False,
    )
    ai_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    pricing_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    experience_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    scored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    rfp = relationship("Rfp", back_populates="proposals")
    vendor = relationship("Vendor", back_populates="proposals")

    def __repr__(self) -> str:
        return f"<Proposal(id={self.id}, rfp_id={self.rfp_id})>"


# Add to Vendor model
from app.models.vendor import Vendor
Vendor.proposals = relationship("Proposal", back_populates="vendor")
