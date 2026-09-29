from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db_session
from app.schemas.vendor_marketplace import (
    MarketplaceProductListResponse,
    MarketplaceProductCard,
    MarketplaceProductDetail,
    MarketplaceServiceListResponse,
    MarketplaceServiceCard,
    BulkSalePublic,
)
from app.services import vendor_marketplace_service as svc

router = APIRouter(prefix="/marketplace", tags=["Vendor Marketplace"])


@router.get("/products", response_model=MarketplaceProductListResponse)
async def browse_products(
    db: AsyncSession = Depends(get_db_session),
    search: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
):
    """Public: published products from verified vendors across the marketplace."""
    items, total = await svc.list_marketplace_products(
        db, search=search, category=category, page=page, page_size=page_size
    )
    out = []
    for p in items:
        card = MarketplaceProductCard.model_validate(p)
        card.has_bulk_pricing = bool(p.bulk_pricing)
        out.append(card)
    return MarketplaceProductListResponse(items=out, total=total, page=page, page_size=page_size)


@router.get("/services", response_model=MarketplaceServiceListResponse)
async def browse_services(
    db: AsyncSession = Depends(get_db_session),
    search: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
):
    """Public: published services from verified vendors across the marketplace."""
    items, total = await svc.list_marketplace_services(
        db, search=search, category=category, page=page, page_size=page_size
    )
    return MarketplaceServiceListResponse(
        items=[MarketplaceServiceCard.model_validate(s) for s in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/products/{product_id}", response_model=MarketplaceProductDetail)
async def get_product_detail(product_id: UUID, db: AsyncSession = Depends(get_db_session)):
    """Public product detail with tiered bulk pricing. Only verified vendors' published products."""
    product = await svc.get_marketplace_product(db, product_id)
    if not product:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(detail="Product not found", code="PRODUCT_NOT_FOUND")

    detail = MarketplaceProductDetail.model_validate(product)
    detail.has_bulk_pricing = bool(product.bulk_pricing)
    detail.bulk_pricing = list(product.bulk_pricing)
    if product.bulk_sale and product.bulk_sale.is_active:
        detail.bulk_sale = await svc.bulk_sale_response(db, product.bulk_sale)
    return detail
