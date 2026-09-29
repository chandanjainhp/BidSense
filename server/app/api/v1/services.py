from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db_session
from app.models.user import User
from app.models.product import ListingStatus
from app.schemas.vendor_marketplace import (
    ServiceCreate, ServiceUpdate, ServicePublic, ServiceListResponse,
)
from app.services import vendor_marketplace_service as svc

router = APIRouter(prefix="/vendors/me/services", tags=["Vendor Marketplace"])


@router.get("", response_model=ServiceListResponse)
async def list_my_services(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: ListingStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    items, total = await svc.list_vendor_services(db, vendor.id, status_filter, page, page_size)
    return ServiceListResponse(
        items=[ServicePublic.model_validate(s) for s in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=ServicePublic, status_code=201)
async def create_my_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    service = await svc.create_service(db, vendor, data)
    return ServicePublic.model_validate(service)


@router.get("/{service_id}", response_model=ServicePublic)
async def get_my_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    service = await svc.get_vendor_service(db, vendor, service_id)
    return ServicePublic.model_validate(service)


@router.patch("/{service_id}", response_model=ServicePublic)
async def update_my_service(
    service_id: UUID,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    service = await svc.get_vendor_service(db, vendor, service_id)
    service = await svc.update_service(db, service, data)
    return ServicePublic.model_validate(service)


@router.delete("/{service_id}", status_code=204)
async def delete_my_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    vendor = await svc.get_vendor_for_user(db, current_user)
    service = await svc.get_vendor_service(db, vendor, service_id)
    await svc.delete_service(db, service)
