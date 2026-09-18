from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.base import get_db_session
from app.models.rfp import Rfp, RfpStatus, RfpInvitation, InvitationStatus, RfpEvent, RfpEventType
from app.schemas.rfp import (
    RfpCreate, RfpUpdate, RfpPublic, RfpListResponse, RfpSendRequest,
    RfpAnalytics, RfpHistoryResponse, RfpEventPublic, RfpDocumentUpdate
)
from app.core.dependencies import get_current_user
from app.models.user import User
from uuid import UUID
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/rfps", tags=["RFPs"])


@router.get("/", response_model=RfpListResponse)
async def list_rfps(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    department: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List RFPs with pagination and filters."""
    query = select(Rfp).where(Rfp.created_by == current_user.id)

    if status_filter:
        query = query.where(Rfp.status == status_filter)
    if search:
        query = query.where(Rfp.title.ilike(f"%{search}%"))
    if department:
        query = query.where(Rfp.department == department)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Rfp.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    rfps = result.scalars().all()

    # Get vendor counts for each RFP
    rfp_ids = [rfp.id for rfp in rfps]
    vendor_counts = {}
    if rfp_ids:
        vc_query = select(
            RfpInvitation.rfp_id,
            func.count(RfpInvitation.id).label("count")
        ).where(RfpInvitation.rfp_id.in_(rfp_ids)).group_by(RfpInvitation.rfp_id)
        vc_result = await db.execute(vc_query)
        vendor_counts = {row.rfp_id: row.count for row in vc_result}

    items = []
    for rfp in rfps:
        rfp_dict = RfpPublic.model_validate(rfp)
        rfp_dict.vendorCount = vendor_counts.get(rfp.id, 0)
        items.append(rfp_dict)

    return RfpListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=RfpPublic, status_code=status.HTTP_201_CREATED)
async def create_rfp(
    rfp_data: RfpCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new RFP."""
    rfp = Rfp(
        created_by=current_user.id,
        title=rfp_data.title,
        rfp_type=rfp_data.type,
        department=rfp_data.department,
        budget=rfp_data.budget,
        due_date=rfp_data.dueDate,
        description=rfp_data.description,
        status=RfpStatus.DRAFT,
    )
    db.add(rfp)
    await db.flush()
    await db.refresh(rfp)

    # Create event
    event = RfpEvent(
        rfp_id=rfp.id,
        actor_type=RfpEventType.USER,
        actor_name=current_user.full_name,
        action="created",
        detail=f"Created RFP: {rfp.title}",
    )
    db.add(event)

    return RfpPublic.model_validate(rfp)


@router.get("/{rfp_id}", response_model=RfpPublic)
async def get_rfp(
    rfp_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific RFP."""
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    # Get vendor count
    vc_result = await db.execute(
        select(func.count(RfpInvitation.id)).where(RfpInvitation.rfp_id == rfp_id)
    )
    vendor_count = vc_result.scalar() or 0

    rfp_public = RfpPublic.model_validate(rfp)
    rfp_public.vendorCount = vendor_count
    return rfp_public


@router.patch("/{rfp_id}", response_model=RfpPublic)
async def update_rfp(
    rfp_id: UUID,
    rfp_data: RfpUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update an RFP."""
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    update_data = rfp_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rfp, field, value)

    await db.flush()
    await db.refresh(rfp)
    return RfpPublic.model_validate(rfp)


@router.patch("/{rfp_id}/document")
async def update_rfp_document(
    rfp_id: UUID,
    document_data: RfpDocumentUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update RFP document (autosave from editor)."""
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    rfp.document = document_data.document
    await db.flush()
    return {"message": "Document saved"}


@router.post("/{rfp_id}/publish", response_model=RfpPublic)
async def publish_rfp(
    rfp_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Publish an RFP (Draft -> Open)."""
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    rfp.status = RfpStatus.OPEN
    rfp.published_at = datetime.now(timezone.utc)

    event = RfpEvent(
        rfp_id=rfp.id,
        actor_type=RfpEventType.USER,
        actor_name=current_user.full_name,
        action="published",
        detail=f"Published RFP: {rfp.title}",
    )
    db.add(event)

    await db.flush()
    await db.refresh(rfp)
    return RfpPublic.model_validate(rfp)


@router.post("/{rfp_id}/send")
async def send_rfp_to_vendors(
    rfp_id: UUID,
    send_data: RfpSendRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Send RFP to selected vendors."""
    import secrets
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    invitations_created = 0
    for vendor_id in send_data.vendor_ids:
        # Check if invitation already exists
        existing = await db.execute(
            select(RfpInvitation).where(
                RfpInvitation.rfp_id == rfp_id,
                RfpInvitation.vendor_id == vendor_id
            )
        )
        if existing.scalar_one_or_none():
            continue

        token = secrets.token_urlsafe(32)
        invitation = RfpInvitation(
            rfp_id=rfp_id,
            vendor_id=vendor_id,
            invitation_token=token,
        )
        db.add(invitation)
        invitations_created += 1

        # Log event
        event = RfpEvent(
            rfp_id=rfp.id,
            actor_type=RfpEventType.USER,
            actor_name=current_user.full_name,
            action="invited_vendor",
            detail=f"Invited vendor {vendor_id} to RFP",
        )
        db.add(event)

    # TODO: Send emails with invitation links

    return {"message": f"Invitations sent to {invitations_created} vendors"}


@router.get("/{rfp_id}/analytics", response_model=RfpAnalytics)
async def get_rfp_analytics(
    rfp_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get RFP analytics and engagement funnel."""
    # Get invitation stats
    inv_result = await db.execute(
        select(RfpInvitation).where(RfpInvitation.rfp_id == rfp_id)
    )
    invitations = inv_result.scalars().all()

    total = len(invitations)
    viewed = sum(1 for i in invitations if i.status == InvitationStatus.VIEWED)
    started = sum(1 for i in invitations if i.status == InvitationStatus.STARTED)
    submitted = sum(1 for i in invitations if i.status == InvitationStatus.SUBMITTED)
    declined = sum(1 for i in invitations if i.status == InvitationStatus.DECLINED)

    # Get proposal stats
    prop_result = await db.execute(
        select(func.avg(Rfp.amount), func.min(Rfp.amount), func.max(Rfp.amount))
        .where(Rfp.rfp_id == rfp_id)  # Note: This should be Proposal table
    )
    # For now, return None for bid amounts

    return RfpAnalytics(
        total_invitations=total,
        viewed_count=viewed,
        started_count=started,
        submitted_count=submitted,
        declined_count=declined,
    )


@router.get("/{rfp_id}/history", response_model=RfpHistoryResponse)
async def get_rfp_history(
    rfp_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get RFP event history."""
    result = await db.execute(
        select(RfpEvent).where(RfpEvent.rfp_id == rfp_id).order_by(RfpEvent.created_at.desc())
    )
    events = result.scalars().all()
    return RfpHistoryResponse(events=[RfpEventPublic.model_validate(e) for e in events])


@router.delete("/{rfp_id}")
async def delete_rfp(
    rfp_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an RFP."""
    result = await db.execute(select(Rfp).where(Rfp.id == rfp_id))
    rfp = result.scalar_one_or_none()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")

    await db.delete(rfp)
    await db.commit()
    return {"message": "RFP deleted successfully"}
