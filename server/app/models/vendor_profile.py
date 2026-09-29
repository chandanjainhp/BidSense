from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.db.base import Base


class VendorProfileStatus(str, enum.Enum):
    """Lifecycle of a marketplace vendor (independent of RFP-context Vendor status)."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class VendorProfile(Base):
    """Marketplace vendor profile — 1:1 with the owning user account."""
    __tablename__ = "vendor_profiles"
    __table_args__ = (
        Index("ix_vendor_profiles_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(15), nullable=True, index=True)
    pan: Mapped[str | None] = mapped_column(String(10), nullable=True)
    business_category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # List of service areas/regions the vendor covers (e.g. ["Mumbai", "Pune"])
    service_areas: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Public: list of certification names/descriptions
    certifications: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    # PRIVATE: business documents (KYC proofs). Never exposed in public APIs.
    documents: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    status: Mapped[VendorProfileStatus] = mapped_column(
        SQLEnum(VendorProfileStatus, name="vendor_profile_status", create_type=True),
        default=VendorProfileStatus.PENDING,
        nullable=False,
        index=True,
    )
    # Admin verification metadata (private)
    verification_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", backref="vendor_profile")
    products = relationship(
        "Product", back_populates="vendor", cascade="all, delete-orphan"
    )
    services = relationship(
        "VendorService", back_populates="vendor", cascade="all, delete-orphan"
    )
    inquiries = relationship(
        "VendorInquiry", back_populates="vendor", cascade="all, delete-orphan"
    )
    orders = relationship("Order", back_populates="vendor", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<VendorProfile(id={self.id}, business_name={self.business_name}, status={self.status})>"
