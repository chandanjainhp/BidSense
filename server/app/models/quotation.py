from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Integer, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.db.base import Base


class QuotationStatus(str, enum.Enum):
    SENT = "sent"          # vendor sent, awaiting buyer
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"  # became an order


class Quotation(Base):
    """A vendor's formal quote in response to a buyer inquiry."""
    __tablename__ = "quotations"
    __table_args__ = (
        Index("ix_quotations_inquiry_created", "inquiry_id", "created_at"),
        Index("ix_quotations_vendor_status", "vendor_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    inquiry_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendor_inquiries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendor_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quotation_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    # Snapshotted from the inquiry so the quote survives inquiry edits
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    bulk_discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    tax_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    shipping_fee: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[QuotationStatus] = mapped_column(
        SQLEnum(QuotationStatus, name="quotation_status", create_type=True),
        default=QuotationStatus.SENT,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inquiry = relationship("VendorInquiry", back_populates="quotations")
    vendor = relationship("VendorProfile")
    buyer = relationship("User", backref="quotations_received")
    items = relationship(
        "QuotationItem", back_populates="quotation", cascade="all, delete-orphan"
    )
    order = relationship("Order", back_populates="quotation", uselist=False)

    def __repr__(self) -> str:
        return f"<Quotation(id={self.id}, number={self.quotation_number}, status={self.status})>"


class QuotationItem(Base):
    """Line item of a quotation (product or service being quoted)."""
    __tablename__ = "quotation_items"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID, ForeignKey("vendor_services.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    quotation = relationship("Quotation", back_populates="items")

    def __repr__(self) -> str:
        return f"<QuotationItem(id={self.id}, name={self.name}, qty={self.quantity})>"
