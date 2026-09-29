from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.bulk_pricing import InquiryStatus
from app.schemas.vendor_marketplace import (
    InquiryCreate, InquiryPublic, InquiryListResponse,
    InquiryStatusUpdate, QuotationCreate, QuotationPublic,
)
from app.services import vendor_marketplace_service as svc

# --- Buyer-side inquiry creation -------------------------------------------
buyer_router = APIRouter(prefix="/inquiries", tags=["Vendor Marketplace"])


@buyer_router.post("", response_model=InquiryPublic, status_code=201)
async def create_inquiry(
    data: InquiryCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated buyer can inquire about a verified vendor's listing."""
    inquiry = await svc.create_inquiry(db, current_user, data)
    return InquiryPublic.model_validate(inquiry)


# --- Vendor-side inquiry management ----------------------------------------
router = APIRouter(prefix="/vendors/me/inquiries", tags=["Vendor Marketplace"])


@router.get("", response_model=InquiryListResponse)
async def list_my_inquiries(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: InquiryStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items, total = await svc.list_vendor_inquiries(db, vendor.id, status_filter, page, page_size)
    return InquiryListResponse(
        items=[InquiryPublic.model_validate(i) for i in items], total=total
    )


@router.get("/{inquiry_id}", response_model=InquiryPublic)
async def get_my_inquiry(
    inquiry_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    inquiry = await svc.get_vendor_inquiry(db, vendor, inquiry_id)
    inquiry = await svc.mark_inquiry_viewed(db, inquiry)
    return InquiryPublic.model_validate(inquiry)


@router.patch("/{inquiry_id}/status", response_model=InquiryPublic)
async def update_my_inquiry_status(
    inquiry_id: UUID,
    data: InquiryStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    inquiry = await svc.get_vendor_inquiry(db, vendor, inquiry_id)
    inquiry = await svc.update_inquiry_status(db, inquiry, data.status)
    return InquiryPublic.model_validate(inquiry)


@router.post("/{inquiry_id}/quotation", response_model=QuotationPublic, status_code=201)
async def create_quotation_for_inquiry(
    inquiry_id: UUID,
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Vendor responds to an inquiry with a quotation."""
    vendor = await svc.get_vendor_for_user(db, current_user)
    inquiry = await svc.get_vendor_inquiry(db, vendor, inquiry_id)
    quotation = await svc.create_quotation(db, vendor, inquiry, data)
    quotation = await svc.get_quotation_with_items(db, quotation.id)
    return QuotationPublic.model_validate(quotation)
