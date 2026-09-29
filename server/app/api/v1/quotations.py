from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.quotation import Quotation, QuotationStatus
from app.schemas.vendor_marketplace import (
    QuotationPublic, QuotationListResponse, QuotationDecision, OrderPublic,
)
from app.models.order import Order
from app.services import vendor_marketplace_service as svc
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/vendors/me/quotations", tags=["Vendor Marketplace"])


@router.get("", response_model=QuotationListResponse)
async def list_my_quotations(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items, total = await svc.list_vendor_quotations_list(db, vendor.id, page, page_size)
    return QuotationListResponse(
        items=[QuotationPublic.model_validate(q) for q in items], total=total
    )


@router.get("/{quotation_id}", response_model=QuotationPublic)
async def get_my_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    quotation = await svc.get_vendor_quotation(db, vendor, quotation_id)
    quotation = await svc.get_quotation_with_items(db, quotation.id)
    return QuotationPublic.model_validate(quotation)


# ---------------------------------------------------------------------------
# Buyer-side quotation actions
# ---------------------------------------------------------------------------

buyer_router = APIRouter(prefix="/quotations", tags=["Vendor Marketplace"])


@buyer_router.get("", response_model=QuotationListResponse)
async def list_my_received_quotations(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: QuotationStatus | None = Query(None, alias="status"),
):
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.buyer_id == current_user.id)
        .order_by(Quotation.created_at.desc())
    )
    quotations = result.scalars().all()
    return QuotationListResponse(
        items=[QuotationPublic.model_validate(q) for q in quotations], total=len(quotations)
    )


@buyer_router.post("/{quotation_id}/decide", response_model=OrderPublic, status_code=201)
async def decide_quotation(
    quotation_id: UUID,
    data: QuotationDecision,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Buyer accepts (→ order created) or rejects a quotation sent to them."""
    result = await db.execute(
        select(Quotation).where(
            Quotation.id == quotation_id, Quotation.buyer_id == current_user.id
        )
    )
    quotation = result.scalar_one_or_none()
    if not quotation:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(detail="Quotation not found", code="QUOTATION_NOT_FOUND")

    if data.action == "reject":
        quotation.status = QuotationStatus.REJECTED
        await db.flush()
        from app.core.exceptions import UnprocessableError
        raise UnprocessableError(detail="Quotation rejected", code="QUOTATION_REJECTED")

    order = await svc.create_order_from_quotation(db, current_user, quotation)
    order = await db.execute(
        select(Order).options(selectinload(Order.quotation).selectinload(Quotation.items))
        .where(Order.id == order.id)
    )
    return OrderPublic.model_validate(order.scalar_one())
