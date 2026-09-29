from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Integer, Boolean, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.db.base import Base


class BulkPricing(Base):
    """One tier of bulk pricing for a product (min_quantity..max_quantity → unit_price)."""
    __tablename__ = "bulk_pricing"
    __table_args__ = (
        Index("ix_bulk_pricing_product_min", "product_id", "min_quantity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    min_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    max_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # NULL = open-ended (500+)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    product = relationship("Product", back_populates="bulk_pricing")

    def __repr__(self) -> str:
        return f"<BulkPricing(id={self.id}, product_id={self.product_id}, {self.min_quantity}-{self.max_quantity})>"


class BulkSale(Base):
    """A time-boxed bulk-sale offer on a product (active/inactive, start/end date)."""
    __tablename__ = "bulk_sales"
    __table_args__ = (
        Index("ix_bulk_sales_product_active", "product_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True, unique=True
    )
    # One offer per product; tiers live in bulk_pricing
    min_order_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_order_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bulk_discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    product = relationship("Product", back_populates="bulk_sale")


class InquiryStatus(str, enum.Enum):
    PENDING = "pending"
    VIEWED = "viewed"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class VendorInquiry(Base):
    """A buyer's inquiry about a vendor's product or service."""
    __tablename__ = "vendor_inquiries"
    __table_args__ = (
        Index("ix_vendor_inquiries_vendor_status_created", "vendor_id", "status", "created_at"),
        Index("ix_vendor_inquiries_buyer_status", "buyer_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendor_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID, ForeignKey("vendor_services.id", ondelete="SET NULL"), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    target_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    delivery_location: Mapped[str] = mapped_column(String(255), nullable=False)
    required_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[InquiryStatus] = mapped_column(
        SQLEnum(InquiryStatus, name="inquiry_status", create_type=True),
        default=InquiryStatus.PENDING,
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

    vendor = relationship("VendorProfile", back_populates="inquiries")
    buyer = relationship("User", backref="vendor_inquiries")
    product = relationship("Product")
    service = relationship("VendorService")
    quotations = relationship(
        "Quotation", back_populates="inquiry", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<VendorInquiry(id={self.id}, vendor_id={self.vendor_id}, status={self.status})>"
