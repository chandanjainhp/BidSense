"""Vendor marketplace service layer.

Ownership is always derived from the authenticated user — never from client-supplied IDs.
"""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError, UnprocessableError
from app.core.security import get_password_hash
from app.models.user import User
from app.models.vendor_profile import VendorProfile, VendorProfileStatus
from app.models.product import Product, VendorService, ListingStatus
from app.models.bulk_pricing import BulkPricing, BulkSale, VendorInquiry, InquiryStatus
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.order import Order, OrderStatus
from app.schemas.vendor_marketplace import (
    VendorRegisterRequest,
    VendorProfileUpdate,
    ProductCreate,
    ProductUpdate,
    ServiceCreate,
    ServiceUpdate,
    BulkSaleInput,
    BulkSaleUpdate,
    BulkSalePublic,
    QuotationCreate,
    OrderStatusUpdate,
)


def _to_float(v) -> float | None:
    return float(v) if v is not None else None


# ---------------------------------------------------------------------------
# Vendor profile
# ---------------------------------------------------------------------------

async def get_vendor_for_user(db: AsyncSession, user: User) -> VendorProfile:
    """Fetch the vendor profile owned by the authenticated user, or 404."""
    result = await db.execute(
        select(VendorProfile).where(VendorProfile.user_id == user.id)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise NotFoundError(detail="Vendor profile not found", code="VENDOR_NOT_FOUND")
    return vendor


async def get_vendor_or_404(db: AsyncSession, vendor_id: UUID) -> VendorProfile:
    result = await db.execute(select(VendorProfile).where(VendorProfile.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise NotFoundError(detail="Vendor not found", code="VENDOR_NOT_FOUND")
    return vendor


async def register_vendor(
    db: AsyncSession,
    request: VendorRegisterRequest,
    current_user: User | None,
) -> VendorProfile:
    """Create a vendor profile.

    - If authenticated, the profile attaches to the current user (email must match or be unused).
    - If not authenticated, a new unverified User account is created with the given password
      and the standard signup OTP flow takes over for email verification.
    """
    # Resolve the owning user
    user = current_user
    if user is not None and str(user.email).lower() != str(request.email).lower():
        # Authenticated user registering a business under a different email — still their account
        user = None

    if user is None:
        result = await db.execute(select(User).where(User.email == request.email))
        existing = result.scalar_one_or_none()
        if existing:
            # Attach profile to the existing account only when authenticated as that account
            if current_user is not None:
                raise PermissionDeniedError(
                    detail="Email belongs to another account", code="EMAIL_TAKEN"
                )
            raise ConflictError(
                detail="An account with this email already exists. Please log in to register as a vendor.",
                code="USER_EXISTS",
            )
        if not request.full_name or not request.password:
            raise UnprocessableError(
                detail="full_name and password are required for new vendor accounts",
                code="MISSING_ACCOUNT_FIELDS",
            )
        user = User(
            full_name=request.full_name,
            email=request.email,
            hashed_password=get_password_hash(request.password),
            is_verified=False,  # verified via the existing OTP flow
        )
        db.add(user)
        await db.flush()

    # One vendor profile per user
    result = await db.execute(select(VendorProfile).where(VendorProfile.user_id == user.id))
    if result.scalar_one_or_none():
        raise ConflictError(detail="Vendor profile already exists for this account", code="VENDOR_EXISTS")

    vendor = VendorProfile(
        user_id=user.id,
        business_name=request.business_name,
        contact_name=request.contact_name,
        contact_email=request.email,
        contact_phone=request.phone,
        gstin=request.gstin,
        pan=request.pan,
        business_category=request.business_category,
        description=request.description,
        address_line=request.address_line,
        city=request.city,
        state=request.state,
        pincode=request.pincode,
        service_areas=request.service_areas or [],
        website=request.website,
        documents=request.documents or [],
        status=VendorProfileStatus.PENDING,
    )
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    return vendor


async def update_vendor_profile(
    db: AsyncSession, vendor: VendorProfile, data: VendorProfileUpdate
) -> VendorProfile:
    update = data.model_dump(exclude_unset=True)
    for field, value in update.items():
        setattr(vendor, field, value)
    await db.flush()
    await db.refresh(vendor)
    return vendor


async def list_public_vendors(
    db: AsyncSession,
    search: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[VendorProfile], int]:
    """Only VERIFIED vendors are publicly visible."""
    query = select(VendorProfile).where(VendorProfile.status == VendorProfileStatus.VERIFIED)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                VendorProfile.business_name.ilike(like),
                VendorProfile.description.ilike(like),
                VendorProfile.business_category.ilike(like),
            )
        )
    if category:
        query = query.where(VendorProfile.business_category == category)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.order_by(VendorProfile.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


# ---------------------------------------------------------------------------
# Products & services
# ---------------------------------------------------------------------------

async def list_vendor_products(
    db: AsyncSession, vendor_id: UUID, status_filter: ListingStatus | None = None,
    page: int = 1, page_size: int = 50,
) -> tuple[list[Product], int]:
    query = select(Product).where(Product.vendor_id == vendor_id)
    if status_filter:
        query = query.where(Product.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_vendor_product(db: AsyncSession, vendor: VendorProfile, product_id: UUID) -> Product:
    """Ownership check: product must belong to the authenticated vendor."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.vendor_id == vendor.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundError(detail="Product not found", code="PRODUCT_NOT_FOUND")
    return product


async def create_product(db: AsyncSession, vendor: VendorProfile, data: ProductCreate) -> Product:
    product = Product(vendor_id=vendor.id, **data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


async def update_product(db: AsyncSession, product: Product, data: ProductUpdate) -> Product:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product: Product) -> None:
    await db.delete(product)
    await db.flush()


async def list_vendor_services(
    db: AsyncSession, vendor_id: UUID, status_filter: ListingStatus | None = None,
    page: int = 1, page_size: int = 50,
) -> tuple[list[VendorService], int]:
    query = select(VendorService).where(VendorService.vendor_id == vendor_id)
    if status_filter:
        query = query.where(VendorService.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.order_by(VendorService.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_vendor_service(db: AsyncSession, vendor: VendorProfile, service_id: UUID) -> VendorService:
    result = await db.execute(
        select(VendorService).where(VendorService.id == service_id, VendorService.vendor_id == vendor.id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise NotFoundError(detail="Service not found", code="SERVICE_NOT_FOUND")
    return service


async def create_service(db: AsyncSession, vendor: VendorProfile, data: ServiceCreate) -> VendorService:
    service = VendorService(vendor_id=vendor.id, **data.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


async def update_service(db: AsyncSession, service: VendorService, data: ServiceUpdate) -> VendorService:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.flush()
    await db.refresh(service)
    return service


async def delete_service(db: AsyncSession, service: VendorService) -> None:
    await db.delete(service)
    await db.flush()


# ---------------------------------------------------------------------------
# Bulk sales
# ---------------------------------------------------------------------------

async def bulk_sale_response(db: AsyncSession, bulk_sale: BulkSale) -> BulkSalePublic:
    """Build the public response with tiers eagerly loaded (avoids lazy-load IO)."""
    result = await db.execute(
        select(BulkSale)
        .options(selectinload(BulkSale.product).selectinload(Product.bulk_pricing))
        .where(BulkSale.id == bulk_sale.id)
    )
    bs = result.scalar_one()
    return BulkSalePublic(
        id=bs.id,
        product_id=bs.product_id,
        min_order_quantity=bs.min_order_quantity,
        max_order_quantity=bs.max_order_quantity,
        bulk_discount_percent=bs.bulk_discount_percent,
        is_active=bs.is_active,
        starts_at=bs.starts_at,
        ends_at=bs.ends_at,
        tiers=bs.product.bulk_pricing,
        created_at=bs.created_at,
        updated_at=bs.updated_at,
    )


async def list_vendor_bulk_sales(db: AsyncSession, vendor_id: UUID) -> list[BulkSale]:
    result = await db.execute(
        select(BulkSale)
        .join(Product, Product.id == BulkSale.product_id)
        .where(Product.vendor_id == vendor_id)
        .order_by(BulkSale.created_at.desc())
    )
    return list(result.scalars().all())


async def get_vendor_bulk_sale(db: AsyncSession, vendor: VendorProfile, bulk_sale_id: UUID) -> BulkSale:
    result = await db.execute(
        select(BulkSale)
        .join(Product, Product.id == BulkSale.product_id)
        .where(BulkSale.id == bulk_sale_id, Product.vendor_id == vendor.id)
    )
    bulk_sale = result.scalar_one_or_none()
    if not bulk_sale:
        raise NotFoundError(detail="Bulk sale not found", code="BULK_SALE_NOT_FOUND")
    return bulk_sale


async def _replace_tiers(db: AsyncSession, product_id: UUID, tiers: list) -> None:
    """Replace all pricing tiers for a product after validating ranges."""
    await db.execute(delete(BulkPricing).where(BulkPricing.product_id == product_id))
    for t in tiers:
        db.add(BulkPricing(
            product_id=product_id,
            min_quantity=t.min_quantity,
            max_quantity=t.max_quantity,
            unit_price=t.unit_price,
        ))
    await db.flush()  # session uses autoflush=False; make tiers visible to subsequent SELECTs


async def create_bulk_sale(db: AsyncSession, vendor: VendorProfile, data: BulkSaleInput) -> BulkSale:
    product = await get_vendor_product(db, vendor, data.product_id)
    # One active bulk sale per product
    existing = await db.execute(select(BulkSale).where(BulkSale.product_id == product.id))
    if existing.scalar_one_or_none():
        raise ConflictError(
            detail="A bulk sale already exists for this product", code="BULK_SALE_EXISTS"
        )
    bulk_sale = BulkSale(
        product_id=product.id,
        min_order_quantity=data.min_order_quantity,
        max_order_quantity=data.max_order_quantity,
        bulk_discount_percent=data.bulk_discount_percent,
        is_active=data.is_active,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
    )
    db.add(bulk_sale)
    await db.flush()
    await _replace_tiers(db, product.id, data.tiers)
    await db.refresh(bulk_sale)
    return bulk_sale


async def get_quotation_with_items(db: AsyncSession, quotation_id: UUID) -> Quotation:
    """Fetch a quotation with items eagerly loaded (safe for response serialization)."""
    result = await db.execute(
        select(Quotation).options(selectinload(Quotation.items)).where(Quotation.id == quotation_id)
    )
    return result.scalar_one()


async def update_bulk_sale(
    db: AsyncSession, bulk_sale: BulkSale, data: BulkSaleUpdate
) -> BulkSale:
    update = data.model_dump(exclude_unset=True)
    tiers = update.pop("tiers", None)
    for field, value in update.items():
        setattr(bulk_sale, field, value)
    if tiers is not None:
        await _replace_tiers(db, bulk_sale.product_id, tiers)
    await db.flush()
    await db.refresh(bulk_sale)
    return bulk_sale


async def delete_bulk_sale(db: AsyncSession, bulk_sale: BulkSale) -> None:
    await db.execute(delete(BulkPricing).where(BulkPricing.product_id == bulk_sale.product_id))
    await db.delete(bulk_sale)
    await db.flush()


# ---------------------------------------------------------------------------
# Inquiries
# ---------------------------------------------------------------------------

async def list_vendor_inquiries(
    db: AsyncSession, vendor_id: UUID, status_filter: InquiryStatus | None = None,
    page: int = 1, page_size: int = 50,
) -> tuple[list[VendorInquiry], int]:
    query = select(VendorInquiry).where(VendorInquiry.vendor_id == vendor_id)
    if status_filter:
        query = query.where(VendorInquiry.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.order_by(VendorInquiry.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_vendor_inquiry(db: AsyncSession, vendor: VendorProfile, inquiry_id: UUID) -> VendorInquiry:
    result = await db.execute(
        select(VendorInquiry).where(VendorInquiry.id == inquiry_id, VendorInquiry.vendor_id == vendor.id)
    )
    inquiry = result.scalar_one_or_none()
    if not inquiry:
        raise NotFoundError(detail="Inquiry not found", code="INQUIRY_NOT_FOUND")
    return inquiry


async def create_inquiry(db: AsyncSession, buyer: User, data) -> VendorInquiry:
    """Buyer creates an inquiry against a VERIFIED vendor's published listing."""
    vendor = await get_vendor_or_404(db, data.vendor_id)
    if vendor.status != VendorProfileStatus.VERIFIED:
        raise UnprocessableError(detail="Vendor is not accepting inquiries", code="VENDOR_NOT_VERIFIED")

    if data.product_id:
        product = await db.execute(
            select(Product).where(Product.id == data.product_id, Product.vendor_id == vendor.id)
        )
        if not product.scalar_one_or_none():
            raise NotFoundError(detail="Product not found for this vendor", code="PRODUCT_NOT_FOUND")
    if data.service_id:
        service = await db.execute(
            select(VendorService).where(VendorService.id == data.service_id, VendorService.vendor_id == vendor.id)
        )
        if not service.scalar_one_or_none():
            raise NotFoundError(detail="Service not found for this vendor", code="SERVICE_NOT_FOUND")

    inquiry = VendorInquiry(
        buyer_id=buyer.id,
        vendor_id=vendor.id,
        product_id=data.product_id,
        service_id=data.service_id,
        quantity=data.quantity,
        target_price=data.target_price,
        delivery_location=data.delivery_location,
        required_date=data.required_date,
        message=data.message,
        status=InquiryStatus.PENDING,
    )
    db.add(inquiry)
    await db.flush()
    await db.refresh(inquiry)
    return inquiry


async def mark_inquiry_viewed(db: AsyncSession, inquiry: VendorInquiry) -> VendorInquiry:
    if inquiry.status == InquiryStatus.PENDING:
        inquiry.status = InquiryStatus.VIEWED
        await db.flush()
    return inquiry


async def update_inquiry_status(
    db: AsyncSession, inquiry: VendorInquiry, new_status: InquiryStatus
) -> VendorInquiry:
    allowed = {
        InquiryStatus.PENDING: {InquiryStatus.VIEWED, InquiryStatus.CANCELLED},
        InquiryStatus.VIEWED: {InquiryStatus.QUOTED, InquiryStatus.REJECTED, InquiryStatus.CANCELLED},
        InquiryStatus.QUOTED: {InquiryStatus.ACCEPTED, InquiryStatus.REJECTED, InquiryStatus.CANCELLED},
        InquiryStatus.ACCEPTED: set(),
        InquiryStatus.REJECTED: set(),
        InquiryStatus.CANCELLED: set(),
    }
    if new_status not in allowed.get(inquiry.status, set()):
        raise UnprocessableError(
            detail=f"Cannot change inquiry status from '{inquiry.status.value}' to '{new_status.value}'",
            code="INVALID_STATUS_TRANSITION",
        )
    inquiry.status = new_status
    await db.flush()
    await db.refresh(inquiry)
    return inquiry


# ---------------------------------------------------------------------------
# Quotations
# ---------------------------------------------------------------------------

def _quotation_number() -> str:
    return f"QT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{Quotation.__table__.name and ''}{datetime.now(timezone.utc).microsecond:06d}"


async def list_vendor_quotations_list(
    db: AsyncSession, vendor_id: UUID, page: int = 1, page_size: int = 50
) -> tuple[list[Quotation], int]:
    """List vendor quotations with items eagerly loaded for safe serialization."""
    query = select(Quotation).where(Quotation.vendor_id == vendor_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(selectinload(Quotation.items))
        .order_by(Quotation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_vendor_quotation(db: AsyncSession, vendor: VendorProfile, quotation_id: UUID) -> Quotation:
    result = await db.execute(
        select(Quotation).where(Quotation.id == quotation_id, Quotation.vendor_id == vendor.id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise NotFoundError(detail="Quotation not found", code="QUOTATION_NOT_FOUND")
    return quotation


async def create_quotation(
    db: AsyncSession, vendor: VendorProfile, inquiry: VendorInquiry, data: QuotationCreate
) -> Quotation:
    """Create a quotation for an inquiry. Totals computed server-side from items."""
    # Unit price snapshot: first item's effective price drives the summary fields
    first = data.items[0]
    quantity = sum(i.quantity for i in data.items)
    subtotal = sum(Decimal(str(i.unit_price)) * i.quantity for i in data.items)
    discount = subtotal * Decimal(str(data.bulk_discount_percent)) / Decimal(100)
    taxed_base = subtotal - discount
    tax = taxed_base * Decimal(str(data.tax_percent)) / Decimal(100)
    total = taxed_base + tax + Decimal(str(data.shipping_fee))

    quotation = Quotation(
        inquiry_id=inquiry.id,
        vendor_id=vendor.id,
        buyer_id=inquiry.buyer_id,
        quotation_number=_quotation_number(),
        quantity=quantity,
        unit_price=float(first.unit_price),
        bulk_discount_percent=data.bulk_discount_percent,
        tax_percent=data.tax_percent,
        shipping_fee=data.shipping_fee,
        total_amount=float(total),
        valid_until=data.valid_until,
        delivery_time=data.delivery_time,
        terms=data.terms,
        status=QuotationStatus.SENT,
    )
    db.add(quotation)
    await db.flush()

    for item in data.items:
        db.add(QuotationItem(
            quotation_id=quotation.id,
            product_id=item.product_id,
            service_id=item.service_id,
            name=item.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=float(Decimal(str(item.unit_price)) * item.quantity),
        ))

    # Inquiry moves to quoted
    if inquiry.status in (InquiryStatus.PENDING, InquiryStatus.VIEWED):
        inquiry.status = InquiryStatus.QUOTED
    await db.flush()
    await db.refresh(quotation)
    return quotation


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

async def list_vendor_orders(
    db: AsyncSession, vendor_id: UUID, status_filter: OrderStatus | None = None,
    page: int = 1, page_size: int = 50,
) -> tuple[list[Order], int]:
    query = select(Order).where(Order.vendor_id == vendor_id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(selectinload(Order.quotation).selectinload(Quotation.items))
        .order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_vendor_order(db: AsyncSession, vendor: VendorProfile, order_id: UUID) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.vendor_id == vendor.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundError(detail="Order not found", code="ORDER_NOT_FOUND")
    return order


_ACTIVE_STATUSES = {
    OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED,
}
_REVENUE_STATUSES = {OrderStatus.DELIVERED, OrderStatus.COMPLETED}


async def create_order_from_quotation(db: AsyncSession, buyer: User, quotation: Quotation) -> Order:
    """Buyer accepts a quotation → order is created."""
    if quotation.status != QuotationStatus.SENT:
        raise UnprocessableError(
            detail=f"Quotation is not open for acceptance (status: {quotation.status.value})",
            code="QUOTATION_NOT_OPEN",
        )
    if quotation.valid_until:
        expires = quotation.valid_until
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            quotation.status = QuotationStatus.EXPIRED
            await db.flush()
            raise UnprocessableError(detail="Quotation has expired", code="QUOTATION_EXPIRED")

    order = Order(
        order_number=f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{datetime.now(timezone.utc).microsecond:06d}",
        quotation_id=quotation.id,
        vendor_id=quotation.vendor_id,
        buyer_id=buyer.id,
        status=OrderStatus.PENDING,
        total_amount=quotation.total_amount,
        delivery_location="",
        notes=None,
    )
    db.add(order)
    quotation.status = QuotationStatus.CONVERTED

    inquiry = await db.execute(select(VendorInquiry).where(VendorInquiry.id == quotation.inquiry_id))
    inquiry_row = inquiry.scalar_one_or_none()
    if inquiry_row:
        inquiry_row.status = InquiryStatus.ACCEPTED
        order.delivery_location = inquiry_row.delivery_location

    await db.flush()
    await db.refresh(order)
    return order


async def update_order_status(
    db: AsyncSession, order: Order, data: OrderStatusUpdate
) -> Order:
    """Validate order status transitions server-side; never trust client-side state."""
    transitions = {
        OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
        OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
        OrderStatus.DELIVERED: {OrderStatus.COMPLETED},
        OrderStatus.COMPLETED: set(),
        OrderStatus.CANCELLED: set(),
    }
    if data.status not in transitions.get(order.status, set()):
        raise UnprocessableError(
            detail=f"Cannot change order status from '{order.status.value}' to '{data.status.value}'",
            code="INVALID_STATUS_TRANSITION",
        )
    order.status = data.status
    await db.flush()
    await db.refresh(order)
    return order


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

async def get_vendor_dashboard_stats(db: AsyncSession, vendor: VendorProfile) -> dict:
    async def count(model, *conditions):
        q = select(func.count()).select_from(model)
        if conditions:
            q = q.where(*conditions)
        return (await db.execute(q)).scalar() or 0

    total_products = await count(Product, Product.vendor_id == vendor.id)
    total_services = await count(VendorService, VendorService.vendor_id == vendor.id)
    active_listings = await count(
        Product, Product.vendor_id == vendor.id, Product.status == ListingStatus.PUBLISHED
    ) + await count(
        VendorService, VendorService.vendor_id == vendor.id, VendorService.status == ListingStatus.PUBLISHED
    )
    bulk_sale_listings = await count(
        BulkSale, BulkSale.is_active == True  # noqa: E712
    ) - 0
    # restrict bulk sales to this vendor via join
    bulk_result = await db.execute(
        select(func.count(BulkSale.id))
        .join(Product, Product.id == BulkSale.product_id)
        .where(Product.vendor_id == vendor.id, BulkSale.is_active == True)  # noqa: E712
    )
    bulk_sale_listings = bulk_result.scalar() or 0

    pending_inquiries = await count(
        VendorInquiry, VendorInquiry.vendor_id == vendor.id,
        VendorInquiry.status.in_([InquiryStatus.PENDING, InquiryStatus.VIEWED]),
    )
    pending_quotations = await count(
        Quotation, Quotation.vendor_id == vendor.id, Quotation.status == QuotationStatus.SENT
    )
    active_orders = await count(
        Order, Order.vendor_id == vendor.id, Order.status.in_(_ACTIVE_STATUSES)
    )
    completed_orders = await count(
        Order, Order.vendor_id == vendor.id, Order.status == OrderStatus.COMPLETED
    )

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.vendor_id == vendor.id, Order.status.in_(_REVENUE_STATUSES)
        )
    )
    revenue = float(revenue_result.scalar() or 0)

    # Recent activity: latest inquiries + orders
    recent = []
    inq_result = await db.execute(
        select(VendorInquiry).where(VendorInquiry.vendor_id == vendor.id)
        .order_by(VendorInquiry.created_at.desc()).limit(5)
    )
    for inq in inq_result.scalars().all():
        recent.append({
            "type": "inquiry", "id": str(inq.id), "status": inq.status.value,
            "quantity": inq.quantity, "created_at": inq.created_at.isoformat(),
        })
    ord_result = await db.execute(
        select(Order).where(Order.vendor_id == vendor.id)
        .order_by(Order.created_at.desc()).limit(5)
    )
    for o in ord_result.scalars().all():
        recent.append({
            "type": "order", "id": str(o.id), "order_number": o.order_number,
            "status": o.status.value, "total": float(o.total_amount),
            "created_at": o.created_at.isoformat(),
        })
    recent.sort(key=lambda r: r["created_at"], reverse=True)

    return {
        "total_products": total_products,
        "total_services": total_services,
        "active_listings": active_listings,
        "bulk_sale_listings": bulk_sale_listings,
        "pending_inquiries": pending_inquiries,
        "pending_quotations": pending_quotations,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "revenue": revenue,
        "recent_activity": recent[:8],
    }


# ---------------------------------------------------------------------------
# Buyer-facing marketplace browsing (public)
# ---------------------------------------------------------------------------

async def list_marketplace_products(
    db: AsyncSession, search: str | None = None, category: str | None = None,
    page: int = 1, page_size: int = 24,
) -> tuple[list[Product], int]:
    """Published products from VERIFIED vendors, newest first."""
    query = (
        select(Product)
        .join(VendorProfile, VendorProfile.id == Product.vendor_id)
        .where(Product.status == ListingStatus.PUBLISHED, VendorProfile.status == VendorProfileStatus.VERIFIED)
    )
    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category:
        query = query.where(Product.category.ilike(category.strip()))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(
            selectinload(Product.vendor),
            selectinload(Product.bulk_pricing),
        )
        .order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def list_marketplace_services(
    db: AsyncSession, search: str | None = None, category: str | None = None,
    page: int = 1, page_size: int = 24,
) -> tuple[list[VendorService], int]:
    """Published services from VERIFIED vendors, newest first."""
    query = (
        select(VendorService)
        .join(VendorProfile, VendorProfile.id == VendorService.vendor_id)
        .where(VendorService.status == ListingStatus.PUBLISHED, VendorProfile.status == VendorProfileStatus.VERIFIED)
    )
    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(VendorService.name.ilike(like), VendorService.description.ilike(like)))
    if category:
        query = query.where(VendorService.category.ilike(category.strip()))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(selectinload(VendorService.vendor))
        .order_by(VendorService.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), int(total)


async def get_marketplace_product(db: AsyncSession, product_id: UUID) -> Product | None:
    """One published product from a verified vendor, with tiers + bulk sale. None if not public."""
    result = await db.execute(
        select(Product)
        .join(VendorProfile, VendorProfile.id == Product.vendor_id)
        .options(
            selectinload(Product.vendor),
            selectinload(Product.bulk_pricing),
            selectinload(Product.bulk_sale),
        )
        .where(
            Product.id == product_id,
            Product.status == ListingStatus.PUBLISHED,
            VendorProfile.status == VendorProfileStatus.VERIFIED,
        )
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Buyer-side tracking (own resources only)
# ---------------------------------------------------------------------------

async def list_buyer_inquiries(
    db: AsyncSession, buyer_id: UUID, status_filter: InquiryStatus | None = None,
) -> tuple[list[VendorInquiry], int]:
    query = select(VendorInquiry).where(VendorInquiry.buyer_id == buyer_id)
    if status_filter:
        query = query.where(VendorInquiry.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(
            selectinload(VendorInquiry.vendor),
            selectinload(VendorInquiry.product),
            selectinload(VendorInquiry.service),
            selectinload(VendorInquiry.quotations),
        ).order_by(VendorInquiry.created_at.desc())
    )
    return list(result.scalars().all()), int(total)


async def get_buyer_inquiry(db: AsyncSession, buyer_id: UUID, inquiry_id: UUID) -> VendorInquiry:
    result = await db.execute(
        select(VendorInquiry)
        .options(
            selectinload(VendorInquiry.vendor),
            selectinload(VendorInquiry.product),
            selectinload(VendorInquiry.service),
            selectinload(VendorInquiry.quotations),
        )
        .where(VendorInquiry.id == inquiry_id, VendorInquiry.buyer_id == buyer_id)
    )
    inquiry = result.scalar_one_or_none()
    if not inquiry:
        raise NotFoundError(detail="Inquiry not found", code="INQUIRY_NOT_FOUND")
    return inquiry


async def list_buyer_orders(
    db: AsyncSession, buyer_id: UUID, status_filter: OrderStatus | None = None,
) -> tuple[list[Order], int]:
    query = select(Order).where(Order.buyer_id == buyer_id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(
        query.options(
            selectinload(Order.vendor),
            selectinload(Order.quotation).selectinload(Quotation.items),
        ).order_by(Order.created_at.desc())
    )
    return list(result.scalars().all()), int(total)


async def get_buyer_order(db: AsyncSession, buyer_id: UUID, order_id: UUID) -> Order:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.vendor),
            selectinload(Order.quotation).selectinload(Quotation.items),
        )
        .where(Order.id == order_id, Order.buyer_id == buyer_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundError(detail="Order not found", code="ORDER_NOT_FOUND")
    return order
