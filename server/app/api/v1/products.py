from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.product import ListingStatus
from app.schemas.vendor_marketplace import (
    ProductCreate, ProductUpdate, ProductPublic, ProductListResponse,
)
from app.services import vendor_marketplace_service as svc

router = APIRouter(prefix="/vendors/me/products", tags=["Vendor Marketplace"])


@router.get("", response_model=ProductListResponse)
async def list_my_products(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: ListingStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items, total = await svc.list_vendor_products(db, vendor.id, status_filter, page, page_size)
    return ProductListResponse(
        items=[ProductPublic.model_validate(p) for p in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=ProductPublic, status_code=201)
async def create_my_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    product = await svc.create_product(db, vendor, data)
    return ProductPublic.model_validate(product)


@router.get("/{product_id}", response_model=ProductPublic)
async def get_my_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    product = await svc.get_vendor_product(db, vendor, product_id)
    return ProductPublic.model_validate(product)


@router.patch("/{product_id}", response_model=ProductPublic)
async def update_my_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    product = await svc.get_vendor_product(db, vendor, product_id)
    product = await svc.update_product(db, product, data)
    return ProductPublic.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_my_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    product = await svc.get_vendor_product(db, vendor, product_id)
    await svc.delete_product(db, product)
