from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.schemas.vendor_marketplace import (
    BulkSaleInput, BulkSaleUpdate, BulkSalePublic, BulkSaleListResponse,
)
from app.services import vendor_marketplace_service as svc
router = APIRouter(prefix="/vendors/me/bulk-sales", tags=["Vendor Marketplace"])


@router.get("", response_model=BulkSaleListResponse)
async def list_my_bulk_sales(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items = await svc.list_vendor_bulk_sales(db, vendor.id)
    public_items = []
    for b in items:
        public_items.append(await svc.bulk_sale_response(db, b))
    return BulkSaleListResponse(items=public_items, total=len(public_items))


@router.post("", response_model=BulkSalePublic, status_code=201)
async def create_my_bulk_sale(
    data: BulkSaleInput,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    bulk_sale = await svc.create_bulk_sale(db, vendor, data)
    return await svc.bulk_sale_response(db, bulk_sale)


@router.patch("/{bulk_sale_id}", response_model=BulkSalePublic)
async def update_my_bulk_sale(
    bulk_sale_id: UUID,
    data: BulkSaleUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    bulk_sale = await svc.get_vendor_bulk_sale(db, vendor, bulk_sale_id)
    bulk_sale = await svc.update_bulk_sale(db, bulk_sale, data)
    return await svc.bulk_sale_response(db, bulk_sale)


@router.delete("/{bulk_sale_id}", status_code=204)
async def delete_my_bulk_sale(
    bulk_sale_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    bulk_sale = await svc.get_vendor_bulk_sale(db, vendor, bulk_sale_id)
    await svc.delete_bulk_sale(db, bulk_sale)
