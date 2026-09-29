from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.order import OrderStatus, Order
from app.models.quotation import Quotation
from app.schemas.vendor_marketplace import (
    OrderPublic, OrderListResponse, OrderStatusUpdate,
)
from app.services import vendor_marketplace_service as svc
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.quotation import Quotation as _Quotation  # noqa: F401 (relationship target)

router = APIRouter(prefix="/vendors/me/orders", tags=["Vendor Marketplace"])


@router.get("", response_model=OrderListResponse)
async def list_my_orders(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: OrderStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items, total = await svc.list_vendor_orders(db, vendor.id, status_filter, page, page_size)
    return OrderListResponse(
        items=[OrderPublic.model_validate(o) for o in items], total=total, page=page, page_size=page_size
    )


@router.get("/{order_id}", response_model=OrderPublic)
async def get_my_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    order = await svc.get_vendor_order(db, vendor, order_id)
    order = (await db.execute(
        select(Order).options(selectinload(Order.quotation).selectinload(Quotation.items))
        .where(Order.id == order.id)
    )).scalar_one()
    return OrderPublic.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderPublic)
async def update_my_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Vendor updates order status — transitions validated server-side."""
    vendor = await svc.get_vendor_for_user(db, current_user)
    order = await svc.get_vendor_order(db, vendor, order_id)
    order = await svc.update_order_status(db, order, data)
    order = (await db.execute(
        select(Order).options(selectinload(Order.quotation).selectinload(Quotation.items))
        .where(Order.id == order.id)
    )).scalar_one()
    return OrderPublic.model_validate(order)
