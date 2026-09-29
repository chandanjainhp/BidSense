from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.bulk_pricing import InquiryStatus
from app.models.order import OrderStatus
from app.schemas.vendor_marketplace import (
    BuyerInquiryListResponse,
    BuyerInquiryItem,
    QuotationListResponse,
    QuotationPublic,
    BuyerOrderItem,
    BuyerOrderListResponse,
)
from app.services import vendor_marketplace_service as svc

router = APIRouter(prefix="/my", tags=["Vendor Marketplace"])


@router.get("/inquiries", response_model=BuyerInquiryListResponse)
async def list_my_inquiries(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: InquiryStatus | None = Query(None, alias="status"),
):
    """The authenticated buyer's own inquiries with vendor/listing names for display."""
    items, total = await svc.list_buyer_inquiries(db, current_user.id, status_filter)
    out = []
    for i in items:
        item = BuyerInquiryItem.model_validate(i)
        item.vendor_name = i.vendor.business_name if i.vendor else None
        if i.product:
            item.item_name = i.product.name
        elif i.service:
            item.item_name = i.service.name
        out.append(item)
    return BuyerInquiryListResponse(items=out, total=total)


@router.get("/inquiries/{inquiry_id}", response_model=BuyerInquiryItem)
async def get_my_inquiry(
    inquiry_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    inquiry = await svc.get_buyer_inquiry(db, current_user.id, inquiry_id)
    item = BuyerInquiryItem.model_validate(inquiry)
    item.vendor_name = inquiry.vendor.business_name if inquiry.vendor else None
    if inquiry.product:
        item.item_name = inquiry.product.name
    elif inquiry.service:
        item.item_name = inquiry.service.name
    return item


@router.get("/quotations", response_model=QuotationListResponse)
async def list_my_quotations(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """The authenticated buyer's received quotations (with items eagerly loaded)."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.quotation import Quotation, QuotationStatus

    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.items),
            selectinload(Quotation.inquiry),
        )
        .where(Quotation.buyer_id == current_user.id)
        .order_by(Quotation.created_at.desc())
    )
    quotations = result.scalars().all()
    return QuotationListResponse(
        items=[QuotationPublic.model_validate(q) for q in quotations], total=len(quotations)
    )


@router.get("/orders", response_model=BuyerOrderListResponse)
async def list_my_orders(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: OrderStatus | None = Query(None, alias="status"),
):
    """The authenticated buyer's own orders with vendor names for display."""
    items, total = await svc.list_buyer_orders(db, current_user.id, status_filter)
    out = []
    for o in items:
        item = BuyerOrderItem.model_validate(o)
        item.vendor_name = o.vendor.business_name if o.vendor else None
        out.append(item)
    return BuyerOrderListResponse(items=out, total=total)


@router.get("/orders/{order_id}", response_model=BuyerOrderItem)
async def get_my_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    order = await svc.get_buyer_order(db, current_user.id, order_id)
    item = BuyerOrderItem.model_validate(order)
    item.vendor_name = order.vendor.business_name if order.vendor else None
    return item
