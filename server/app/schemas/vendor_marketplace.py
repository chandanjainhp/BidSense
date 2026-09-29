"""Vendor marketplace Pydantic schemas with strict validation.

Public schemas never include: password fields, private documents,
verification metadata beyond status, or bank details.
"""
import re
from datetime import datetime, date
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator, model_validator

from app.models.vendor_profile import VendorProfileStatus
from app.models.product import ListingStatus
from app.models.bulk_pricing import InquiryStatus
from app.models.quotation import QuotationStatus
from app.models.order import OrderStatus


# ---------------------------------------------------------------------------
# Field validators
# ---------------------------------------------------------------------------

def validate_gstin(v: str | None) -> str | None:
    """GSTIN: 15 chars — 2 digit state code + 10 char PAN + entity code + 'Z' + checksum."""
    if v is None:
        return v
    v = v.strip().upper()
    if not re.fullmatch(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}", v):
        raise ValueError("Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)")
    return v


def validate_pan(v: str | None) -> str | None:
    """PAN: 10 chars — 5 letters + 4 digits + 1 letter."""
    if v is None:
        return v
    v = v.strip().upper()
    if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", v):
        raise ValueError("Invalid PAN format (e.g. ABCDE1234F)")
    return v


def validate_phone(v: str | None) -> str | None:
    """Phone: 10 digits, optional +91 / 0 prefix, optional separators."""
    if v is None:
        return v
    digits = re.sub(r"[\s\-()]", "", v)
    if re.fullmatch(r"(\+91|0)?[6-9][0-9]{9}", digits):
        return digits
    raise ValueError("Invalid Indian phone number (e.g. 9876543210 or +919876543210)")


def validate_pincode(v: str | None) -> str | None:
    if v is None:
        return v
    if not re.fullmatch(r"[1-9][0-9]{5}", v.strip()):
        raise ValueError("Invalid pincode (6 digits, cannot start with 0)")
    return v.strip()


def validate_website(v: str | None) -> str | None:
    if v is None or v == "":
        return v
    if not re.fullmatch(r"https?://[^\s/$.?#].[^\s]*", v.strip(), re.IGNORECASE):
        raise ValueError("Website must be a valid http(s) URL")
    return v.strip()


# ---------------------------------------------------------------------------
# Vendor registration & profile
# ---------------------------------------------------------------------------

class VendorRegisterRequest(BaseModel):
    """Vendor registration — creates User (if needed) + pending VendorProfile.

    Reuses the existing auth/OTP flow: user verifies email via existing OTP,
    vendor profile stays pending until admin verification.
    """
    # Account fields (ignored if user already exists & authenticated)
    full_name: str | None = Field(None, min_length=2, max_length=120)
    email: EmailStr
    password: str | None = Field(None, min_length=8, max_length=128)
    # Business fields
    business_name: str = Field(min_length=2, max_length=200)
    contact_name: str = Field(min_length=2, max_length=120)
    phone: str
    gstin: str | None = None
    pan: str | None = None
    business_category: str = Field(min_length=2, max_length=80)
    description: str | None = Field(None, max_length=5000)
    address_line: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=80)
    state: str | None = Field(None, max_length=80)
    pincode: str | None = None
    service_areas: list[str] | None = None
    website: str | None = None
    documents: list[str] | None = None  # document URLs/names submitted for verification

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v):
        return validate_phone(v)

    @field_validator("gstin")
    @classmethod
    def check_gstin(cls, v):
        return validate_gstin(v)

    @field_validator("pan")
    @classmethod
    def check_pan(cls, v):
        return validate_pan(v)

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, v):
        return validate_pincode(v)

    @field_validator("website")
    @classmethod
    def check_website(cls, v):
        return validate_website(v)

    @field_validator("password")
    @classmethod
    def check_password(cls, v):
        if v is None:
            return v
        if not re.search(r"[A-Z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain one uppercase letter and one number")
        return v

    @model_validator(mode="after")
    def check_account_fields(self):
        # New-account registrations must include name+password;
        # authenticated users may omit them.
        return self


class VendorProfileUpdate(BaseModel):
    business_name: str | None = Field(None, min_length=2, max_length=200)
    contact_name: str | None = Field(None, min_length=2, max_length=120)
    phone: str | None = None
    gstin: str | None = None
    pan: str | None = None
    business_category: str | None = Field(None, min_length=2, max_length=80)
    description: str | None = Field(None, max_length=5000)
    address_line: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=80)
    state: str | None = Field(None, max_length=80)
    pincode: str | None = None
    service_areas: list[str] | None = None
    website: str | None = None
    logo_url: str | None = Field(None, max_length=500)
    certifications: list[str] | None = None
    documents: list[str] | None = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v):
        return validate_phone(v)

    @field_validator("gstin")
    @classmethod
    def check_gstin(cls, v):
        return validate_gstin(v)

    @field_validator("pan")
    @classmethod
    def check_pan(cls, v):
        return validate_pan(v)

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, v):
        return validate_pincode(v)

    @field_validator("website")
    @classmethod
    def check_website(cls, v):
        return validate_website(v)


class VendorProfilePublic(BaseModel):
    """Vendor's own view of their profile (includes private verification info)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    contact_name: str
    contact_email: str
    contact_phone: str
    gstin: str | None = None
    pan: str | None = None
    business_category: str
    description: str | None = None
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    service_areas: list[str] | None = None
    website: str | None = None
    logo_url: str | None = None
    certifications: list[str] | None = None
    documents: list[str] | None = None
    status: VendorProfileStatus
    verification_note: str | None = None
    verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class VendorStorePublic(BaseModel):
    """PUBLIC vendor view — no private documents, GSTIN/PAN, or verification notes."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    description: str | None = None
    business_category: str
    city: str | None = None
    state: str | None = None
    service_areas: list[str] | None = None
    website: str | None = None
    logo_url: str | None = None
    certifications: list[str] | None = None
    status: VendorProfileStatus
    created_at: datetime


class VendorStoreListResponse(BaseModel):
    items: list[VendorStorePublic]
    total: int
    page: int
    page_size: int


class VendorDashboardStats(BaseModel):
    total_products: int
    total_services: int
    active_listings: int
    bulk_sale_listings: int
    pending_inquiries: int
    pending_quotations: int
    active_orders: int
    completed_orders: int
    revenue: float
    recent_activity: list[dict]


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    sku: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=10000)
    category: str = Field(min_length=2, max_length=80)
    price: float | None = Field(None, ge=0)
    stock: int | None = Field(None, ge=0)
    unit: str = Field("unit", min_length=1, max_length=30)
    moq: int = Field(1, ge=1)
    specifications: dict | None = None
    images: list[str] | None = None
    status: ListingStatus = ListingStatus.DRAFT

    @field_validator("price")
    @classmethod
    def check_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than 0")
        return v


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    sku: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=10000)
    category: str | None = Field(None, min_length=2, max_length=80)
    price: float | None = Field(None, ge=0)
    stock: int | None = Field(None, ge=0)
    unit: str | None = Field(None, min_length=1, max_length=30)
    moq: int | None = Field(None, ge=1)
    specifications: dict | None = None
    images: list[str] | None = None
    status: ListingStatus | None = None

    @field_validator("price")
    @classmethod
    def check_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than 0")
        return v


class BulkPricingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    min_quantity: int
    max_quantity: int | None = None
    unit_price: float
    created_at: datetime
    updated_at: datetime


class ProductPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vendor_id: UUID
    name: str
    sku: str | None = None
    description: str | None = None
    category: str
    price: float | None = None
    stock: int | None = None
    unit: str
    moq: int
    specifications: dict | None = None
    images: list[str] | None = None
    status: ListingStatus
    created_at: datetime
    updated_at: datetime


class ProductWithTiers(ProductPublic):
    bulk_pricing: list[BulkPricingSchema] = []


class ProductListResponse(BaseModel):
    items: list[ProductPublic]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(None, max_length=10000)
    category: str = Field(min_length=2, max_length=80)
    base_price: float | None = Field(None, ge=0)
    pricing_unit: str = Field("project", min_length=1, max_length=30)
    min_quantity: int = Field(1, ge=1)
    service_area: list[str] | None = None
    availability: str = Field("available", pattern="^(available|unavailable|on_request)$")
    delivery_time: str | None = Field(None, max_length=100)
    images: list[str] | None = None
    documents: list[str] | None = None
    terms: str | None = Field(None, max_length=10000)
    status: ListingStatus = ListingStatus.DRAFT

    @field_validator("base_price")
    @classmethod
    def check_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Base price must be greater than 0")
        return v


class ServiceUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = Field(None, max_length=10000)
    category: str | None = Field(None, min_length=2, max_length=80)
    base_price: float | None = Field(None, ge=0)
    pricing_unit: str | None = Field(None, min_length=1, max_length=30)
    min_quantity: int | None = Field(None, ge=1)
    service_area: list[str] | None = None
    availability: str | None = Field(None, pattern="^(available|unavailable|on_request)$")
    delivery_time: str | None = Field(None, max_length=100)
    images: list[str] | None = None
    documents: list[str] | None = None
    terms: str | None = Field(None, max_length=10000)
    status: ListingStatus | None = None

    @field_validator("base_price")
    @classmethod
    def check_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Base price must be greater than 0")
        return v


class ServicePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vendor_id: UUID
    name: str
    description: str | None = None
    category: str
    base_price: float | None = None
    pricing_unit: str
    min_quantity: int
    service_area: list[str] | None = None
    availability: str
    delivery_time: str | None = None
    images: list[str] | None = None
    documents: list[str] | None = None
    terms: str | None = None
    status: ListingStatus
    created_at: datetime
    updated_at: datetime


class ServiceListResponse(BaseModel):
    items: list[ServicePublic]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Bulk sales
# ---------------------------------------------------------------------------

class BulkTierInput(BaseModel):
    """A single pricing tier (e.g. 50-199 units @ ₹450)."""
    min_quantity: int = Field(ge=1)
    max_quantity: int | None = Field(None, ge=1)
    unit_price: float = Field(gt=0)


class BulkSaleInput(BaseModel):
    product_id: UUID
    min_order_quantity: int = Field(1, ge=1)
    max_order_quantity: int | None = Field(None, ge=1)
    bulk_discount_percent: float = Field(0, ge=0, le=100)
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    tiers: list[BulkTierInput] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_tiers_and_dates(self):
        # Tier ranges must not overlap and must be ascending
        tiers = sorted(self.tiers, key=lambda t: t.min_quantity)
        prev_max: int | None = None
        for t in tiers:
            if t.max_quantity is not None and t.max_quantity < t.min_quantity:
                raise ValueError(f"Tier {t.min_quantity}-{t.max_quantity}: max_quantity must be >= min_quantity")
            if prev_max is not None and t.min_quantity <= prev_max:
                raise ValueError(
                    f"Overlapping pricing tiers: tier starting at {t.min_quantity} overlaps the previous tier ending at {prev_max}"
                )
            prev_max = t.max_quantity
        # At most one open-ended tier, and it must be last
        open_tiers = [t for t in tiers if t.max_quantity is None]
        if len(open_tiers) > 1:
            raise ValueError("Only one open-ended tier (no max_quantity) is allowed")
        if open_tiers and open_tiers[0] is not tiers[-1]:
            raise ValueError("The open-ended tier must have the highest min_quantity")
        # Dates
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        # Order quantity bounds
        if self.max_order_quantity is not None and self.max_order_quantity < self.min_order_quantity:
            raise ValueError("max_order_quantity must be >= min_order_quantity")
        return self


class BulkSaleUpdate(BaseModel):
    min_order_quantity: int | None = Field(None, ge=1)
    max_order_quantity: int | None = Field(None, ge=1)
    bulk_discount_percent: float | None = Field(None, ge=0, le=100)
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    tiers: list[BulkTierInput] | None = None

    @model_validator(mode="after")
    def validate_tiers(self):
        if self.tiers:
            tiers = sorted(self.tiers, key=lambda t: t.min_quantity)
            prev_max: int | None = None
            for t in tiers:
                if t.max_quantity is not None and t.max_quantity < t.min_quantity:
                    raise ValueError(f"Tier {t.min_quantity}-{t.max_quantity}: max_quantity must be >= min_quantity")
                if prev_max is not None and t.min_quantity <= prev_max:
                    raise ValueError(
                        f"Overlapping pricing tiers: tier starting at {t.min_quantity} overlaps the previous tier ending at {prev_max}"
                    )
                prev_max = t.max_quantity
            open_tiers = [t for t in tiers if t.max_quantity is None]
            if len(open_tiers) > 1:
                raise ValueError("Only one open-ended tier (no max_quantity) is allowed")
            if open_tiers and open_tiers[0] is not tiers[-1]:
                raise ValueError("The open-ended tier must have the highest min_quantity")
        if self.max_order_quantity is not None and self.min_order_quantity is not None \
                and self.max_order_quantity < self.min_order_quantity:
            raise ValueError("max_order_quantity must be >= min_order_quantity")
        return self


class BulkTierPublic(BulkPricingSchema):
    pass


class BulkSalePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    min_order_quantity: int
    max_order_quantity: int | None = None
    bulk_discount_percent: float
    is_active: bool
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    tiers: list[BulkTierPublic] = []
    created_at: datetime
    updated_at: datetime


class BulkSaleListResponse(BaseModel):
    items: list[BulkSalePublic]
    total: int


# ---------------------------------------------------------------------------
# Inquiries
# ---------------------------------------------------------------------------

class InquiryCreate(BaseModel):
    """Buyer submits an inquiry (authenticated user)."""
    vendor_id: UUID
    product_id: UUID | None = None
    service_id: UUID | None = None
    quantity: int = Field(ge=1)
    target_price: float | None = Field(None, gt=0)
    delivery_location: str = Field(min_length=2, max_length=255)
    required_date: datetime | None = None
    message: str | None = Field(None, max_length=5000)

    @model_validator(mode="after")
    def check_target(self):
        if self.product_id is None and self.service_id is None:
            raise ValueError("product_id or service_id is required")
        if self.required_date:
            if self.required_date.date() < date.today():
                raise ValueError("required_date cannot be in the past")
        return self


class InquiryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    buyer_id: UUID
    vendor_id: UUID
    product_id: UUID | None = None
    service_id: UUID | None = None
    quantity: int
    target_price: float | None = None
    delivery_location: str
    required_date: datetime | None = None
    message: str | None = None
    status: InquiryStatus
    created_at: datetime
    updated_at: datetime


class InquiryListResponse(BaseModel):
    items: list[InquiryPublic]
    total: int


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


# ---------------------------------------------------------------------------
# Quotations
# ---------------------------------------------------------------------------

class QuotationItemInput(BaseModel):
    product_id: UUID | None = None
    service_id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(ge=1)
    unit_price: float = Field(gt=0)


class QuotationCreate(BaseModel):
    """Vendor responds to an inquiry with a quotation. Totals are computed server-side."""
    bulk_discount_percent: float = Field(0, ge=0, le=100)
    tax_percent: float = Field(0, ge=0, le=100)
    shipping_fee: float = Field(0, ge=0)
    valid_until: datetime | None = None
    delivery_time: str | None = Field(None, max_length=100)
    terms: str | None = Field(None, max_length=10000)
    items: list[QuotationItemInput] = Field(min_length=1)

    @model_validator(mode="after")
    def check_valid_until(self):
        if self.valid_until and self.valid_until.date() < date.today():
            raise ValueError("valid_until cannot be in the past")
        return self


class QuotationItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None = None
    service_id: UUID | None = None
    name: str
    quantity: int
    unit_price: float
    line_total: float


class QuotationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inquiry_id: UUID
    vendor_id: UUID
    buyer_id: UUID
    quotation_number: str
    quantity: int
    unit_price: float
    bulk_discount_percent: float
    tax_percent: float
    shipping_fee: float
    total_amount: float
    valid_until: datetime | None = None
    delivery_time: str | None = None
    terms: str | None = None
    status: QuotationStatus
    created_at: datetime
    updated_at: datetime
    items: list[QuotationItemPublic] = []


class QuotationListResponse(BaseModel):
    items: list[QuotationPublic]
    total: int


class QuotationDecision(BaseModel):
    """Buyer accepts or rejects a quotation."""
    action: str = Field(pattern="^(accept|reject)$")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class OrderStatusUpdate(BaseModel):
    """Vendor updates order status. Transitions validated in the service layer."""
    status: OrderStatus


class OrderPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    quotation_id: UUID
    vendor_id: UUID
    buyer_id: UUID
    status: OrderStatus
    total_amount: float
    delivery_location: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    quotation: QuotationPublic | None = None


class OrderListResponse(BaseModel):
    items: list[OrderPublic]
    total: int


# ---------------------------------------------------------------------------
# Buyer-facing marketplace schemas
# ---------------------------------------------------------------------------

class VendorCard(BaseModel):
    """Minimal public vendor info embedded in marketplace listing cards."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    business_category: str
    city: str | None = None
    state: str | None = None
    logo_url: str | None = None
    status: VendorProfileStatus


class MarketplaceProductCard(ProductPublic):
    """Published product as shown to browsers, with the vendor identity."""
    vendor: VendorCard
    has_bulk_pricing: bool = False


class MarketplaceServiceCard(ServicePublic):
    """Published service as shown to browsers, with the vendor identity."""
    vendor: VendorCard


class MarketplaceProductListResponse(BaseModel):
    items: list[MarketplaceProductCard]
    total: int
    page: int
    page_size: int


class MarketplaceServiceListResponse(BaseModel):
    items: list[MarketplaceServiceCard]
    total: int
    page: int
    page_size: int


class MarketplaceProductDetail(MarketplaceProductCard):
    """Full public detail for one product, including its pricing tiers."""
    bulk_pricing: list[BulkPricingSchema] = []
    bulk_sale: BulkSalePublic | None = None


class BuyerInquiryItem(BaseModel):
    """A buyer's own inquiry enriched with display info (vendor name, listing name)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vendor_id: UUID
    product_id: UUID | None = None
    service_id: UUID | None = None
    quantity: int
    target_price: float | None = None
    delivery_location: str
    required_date: datetime | None = None
    message: str | None = None
    status: InquiryStatus
    created_at: datetime
    updated_at: datetime
    vendor_name: str | None = None
    item_name: str | None = None


class BuyerInquiryListResponse(BaseModel):
    items: list[BuyerInquiryItem]
    total: int


class BuyerOrderItem(OrderPublic):
    """A buyer's own order enriched with the vendor's business name."""
    vendor_name: str | None = None


class BuyerOrderListResponse(BaseModel):
    items: list[BuyerOrderItem]
    total: int
