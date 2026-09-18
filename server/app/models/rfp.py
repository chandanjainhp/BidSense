from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
import uuid
import enum

from app.db.base import Base


class RfpStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    AWARDED = "awarded"
    CANCELLED = "cancelled"


class Rfp(Base):
    __tablename__ = "rfps"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    rfp_type: Mapped[str] = mapped_column("type", String(60), nullable=False)
    department: Mapped[str] = mapped_column(String(80), nullable=True)
    budget: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RfpStatus] = mapped_column(
        SQLEnum(RfpStatus, name="rfp_status", create_type=True),
        default=RfpStatus.DRAFT,
        nullable=False,
    )
    document: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    creator = relationship("User", back_populates="rfps")
    invitations = relationship("RfpInvitation", back_populates="rfp", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="rfp", cascade="all, delete-orphan")
    events = relationship("RfpEvent", back_populates="rfp", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Rfp(id={self.id}, title={self.title})>"


class InvitationStatus(str, enum.Enum):
    INVITED = "invited"
    VIEWED = "viewed"
    STARTED = "started"
    SUBMITTED = "submitted"
    DECLINED = "declined"


class RfpInvitation(Base):
    __tablename__ = "rfp_invitations"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    rfp_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("rfps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[InvitationStatus] = mapped_column(
        SQLEnum(InvitationStatus, name="invitation_status", create_type=True),
        default=InvitationStatus.INVITED,
        nullable=False,
    )
    invitation_token: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    rfp = relationship("Rfp", back_populates="invitations")
    vendor = relationship("Vendor", back_populates="invitations")

    __table_args__ = (
        # Ensure unique rfp_id + vendor_id combination
        {"sqlite_autoincrement": True},  # For SQLite testing; PostgreSQL uses explicit constraints
    )

    def __repr__(self) -> str:
        return f"<RfpInvitation(rfp_id={self.rfp_id}, vendor_id={self.vendor_id})>"


# Add to Vendor model
from app.models.vendor import Vendor
Vendor.invitations = relationship("RfpInvitation", back_populates="vendor")


class RfpEventType(str, enum.Enum):
    USER = "user"
    AI = "ai"
    SYSTEM = "system"
    VENDOR = "vendor"


class RfpEvent(Base):
    __tablename__ = "rfp_events"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    rfp_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("rfps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_type: Mapped[RfpEventType] = mapped_column(
        SQLEnum(RfpEventType, name="rfp_event_actor_type", create_type=True), nullable=False
    )
    actor_name: Mapped[str] = mapped_column(String(200), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    rfp = relationship("Rfp", back_populates="events")

    def __repr__(self) -> str:
        return f"<RfpEvent(id={self.id}, action={self.action})>"


# Add reverse relationship to User
from app.models.user import User
User.rfps = relationship("Rfp", order_by=Rfp.id, back_populates="creator")
