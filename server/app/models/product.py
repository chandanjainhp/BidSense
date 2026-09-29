from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Integer, Boolean, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.db.base import Base


class ListingStatus(str, enum.Enum):
    """Lifecycle shared by products and services."""
    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    UNPUBLISHED = "unpublished"
    REJECTED = "rejected"


class Product(Base):
    """A vendor's sellable product listing."""
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_vendor_status_created", "vendor_id", "status", "created_at"),
        Index("ix_products_category_status", "category", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendor_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="unit")
    moq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # {"key": "value", ...} arbitrary spec rows
    specifications: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    images: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    status: Mapped[ListingStatus] = mapped_column(
        SQLEnum(ListingStatus, name="listing_status", create_type=True),
        default=ListingStatus.DRAFT,
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

    vendor = relationship("VendorProfile", back_populates="products")
    bulk_pricing = relationship(
        "BulkPricing", back_populates="product", cascade="all, delete-orphan",
        order_by="BulkPricing.min_quantity",
    )
    bulk_sale = relationship("BulkSale", back_populates="product", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, vendor_id={self.vendor_id})>"


class VendorService(Base):
    """A vendor's service listing (implementation, maintenance, consulting...)."""
    __tablename__ = "vendor_services"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("vendor_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    base_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    # "hour" | "day" | "project" | "month" | "unit"
    pricing_unit: Mapped[str] = mapped_column(String(30), nullable=False, default="project")
    min_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Cities/regions served
    service_area: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    # "available" | "unavailable" | "on_request"
    availability: Mapped[str] = mapped_column(String(30), nullable=False, default="available")
    # e.g. "2-4 weeks"
    delivery_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    images: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    documents: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ListingStatus] = mapped_column(
        SQLEnum(ListingStatus, name="listing_status", create_type=True),
        default=ListingStatus.DRAFT,
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

    vendor = relationship("VendorProfile", back_populates="services")

    def __repr__(self) -> str:
        return f"<VendorService(id={self.id}, name={self.name})>"
