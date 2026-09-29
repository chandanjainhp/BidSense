from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_optional_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.product import ListingStatus
from app.schemas.vendor_marketplace import (
    VendorRegisterRequest,
    VendorProfileUpdate,
    VendorProfilePublic,
    VendorStorePublic,
    VendorStoreListResponse,
    VendorDashboardStats,
    ProductListResponse,
    ProductPublic,
    ServiceListResponse,
    ServicePublic,
    BulkSalePublic,
)
from pydantic import BaseModel


class BulkSaleStoreResponse(BaseModel):
    items: list[BulkSalePublic]
    total: int
from app.services import vendor_marketplace_service as svc

router = APIRouter(prefix="/vendors", tags=["Vendor Marketplace"])


@router.post("/register", response_model=VendorProfilePublic, status_code=201)
async def register_vendor(
    request: VendorRegisterRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_user),
):
    """Register as a vendor. Works for new visitors (creates account) and existing users."""
    vendor = await svc.register_vendor(db, request, current_user)
    return VendorProfilePublic.model_validate(vendor)


@router.get("/me", response_model=VendorProfilePublic)
async def get_my_vendor_profile(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    return VendorProfilePublic.model_validate(vendor)


@router.patch("/me", response_model=VendorProfilePublic)
async def update_my_vendor_profile(
    data: VendorProfileUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    vendor = await svc.update_vendor_profile(db, vendor, data)
    return VendorProfilePublic.model_validate(vendor)


@router.get("/me/dashboard", response_model=VendorDashboardStats)
async def get_vendor_dashboard(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    return await svc.get_vendor_dashboard_stats(db, vendor)


@router.get("/store", response_model=VendorStoreListResponse)
async def list_public_vendor_stores(
    db: AsyncSession = Depends(get_db_session),
    search: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Public marketplace listing — VERIFIED vendors only."""
    vendors, total = await svc.list_public_vendors(db, search=search, category=category,
                                                   page=page, page_size=page_size)
    return VendorStoreListResponse(
        items=[VendorStorePublic.model_validate(v) for v in vendors],
        total=total, page=page, page_size=page_size,
    )


@router.get("/store/{vendor_id}", response_model=VendorStorePublic)
async def get_public_vendor_store(vendor_id: UUID, db: AsyncSession = Depends(get_db_session)):
    """Public vendor store — only verified vendors are visible."""
    vendor = await svc.get_vendor_or_404(db, vendor_id)
    if vendor.status.value != "verified":
        from app.core.exceptions import NotFoundError
        raise NotFoundError(detail="Vendor not found", code="VENDOR_NOT_FOUND")
    return VendorStorePublic.model_validate(vendor)


async def _verified_vendor_or_404(db: AsyncSession, vendor_id: UUID):
    from app.core.exceptions import NotFoundError
    vendor = await svc.get_vendor_or_404(db, vendor_id)
    if vendor.status.value != "verified":
        raise NotFoundError(detail="Vendor not found", code="VENDOR_NOT_FOUND")
    return vendor


@router.get("/store/{vendor_id}/products", response_model=ProductListResponse)
async def get_public_store_products(
    vendor_id: UUID, db: AsyncSession = Depends(get_db_session),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
):
    """Public: a verified vendor's published products."""
    vendor = await _verified_vendor_or_404(db, vendor_id)
    items, total = await svc.list_vendor_products(
        db, vendor.id, ListingStatus.PUBLISHED, page, page_size
    )
    return ProductListResponse(
        items=[ProductPublic.model_validate(p) for p in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/store/{vendor_id}/services", response_model=ServiceListResponse)
async def get_public_store_services(
    vendor_id: UUID, db: AsyncSession = Depends(get_db_session),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
):
    """Public: a verified vendor's published services."""
    vendor = await _verified_vendor_or_404(db, vendor_id)
    items, total = await svc.list_vendor_services(
        db, vendor.id, ListingStatus.PUBLISHED, page, page_size
    )
    return ServiceListResponse(
        items=[ServicePublic.model_validate(s) for s in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/store/{vendor_id}/bulk-sales", response_model=BulkSaleStoreResponse)
async def get_public_store_bulk_sales(vendor_id: UUID, db: AsyncSession = Depends(get_db_session)):
    """Public: active bulk-sale offers for a verified vendor (with pricing tiers)."""
    vendor = await _verified_vendor_or_404(db, vendor_id)
    sales = await svc.list_vendor_bulk_sales(db, vendor.id)
    out = []
    for s in sales:
        if not s.is_active:
            continue
        resp = await svc.bulk_sale_response(db, s)
        out.append(resp)
    return BulkSaleStoreResponse(items=out, total=len(out))
