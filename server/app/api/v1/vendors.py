from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.base import get_db_session
from app.models.vendor import Vendor, VendorStatus
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorPublic, VendorListResponse, VendorMetrics
from app.core.dependencies import get_current_user
from app.models.user import User
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("/", response_model=VendorListResponse)
async def list_vendors(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    industry: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List vendors with pagination and filters."""
    query = select(Vendor).where(Vendor.owner_user_id == current_user.id)

    if status_filter:
        query = query.where(Vendor.status == status_filter)
    if search:
        query = query.where(Vendor.name.ilike(f"%{search}%"))
    if industry:
        query = query.where(Vendor.industry == industry)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    vendors = result.scalars().all()

    return VendorListResponse(
        items=[VendorPublic.model_validate(v) for v in vendors],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=VendorPublic, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new vendor."""
    vendor = Vendor(
        owner_user_id=current_user.id,
        **vendor_data.model_dump(),
    )
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    return VendorPublic.model_validate(vendor)


@router.get("/metrics", response_model=VendorMetrics)
async def get_vendor_metrics(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get vendor metrics and breakdown."""
    query = select(Vendor).where(Vendor.owner_user_id == current_user.id)
    result = await db.execute(query)
    vendors = result.scalars().all()

    total = len(vendors)
    active = sum(1 for v in vendors if v.status == VendorStatus.ACTIVE)
    pending = sum(1 for v in vendors if v.status == VendorStatus.PENDING)
    inactive = sum(1 for v in vendors if v.status == VendorStatus.INACTIVE)

    industry_breakdown = {}
    for v in vendors:
        industry = v.industry or "Other"
        industry_breakdown[industry] = industry_breakdown.get(industry, 0) + 1

    return VendorMetrics(
        total=total,
        active=active,
        pending=pending,
        inactive=inactive,
        industry_breakdown=industry_breakdown,
    )


@router.get("/{vendor_id}", response_model=VendorPublic)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific vendor."""
    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.owner_user_id == current_user.id)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorPublic.model_validate(vendor)


@router.patch("/{vendor_id}", response_model=VendorPublic)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update a vendor."""
    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.owner_user_id == current_user.id)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = vendor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)

    await db.flush()
    await db.refresh(vendor)
    return VendorPublic.model_validate(vendor)


@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a vendor."""
    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.owner_user_id == current_user.id)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    await db.delete(vendor)
    await db.commit()
    return {"message": "Vendor deleted successfully"}
