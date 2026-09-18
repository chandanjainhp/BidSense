from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.db.base import get_db_session
from app.models.proposal import Proposal, ProposalStatus
from app.models.rfp import Rfp, RfpInvitation
from app.models.vendor import Vendor
from app.models.notification import Notification, NotificationType
from app.models.activity import Activity
from app.schemas.proposal import (
    ProposalPublic, ProposalListResponse, ProposalComparisonResponse,
    ProposalComparisonItem, ProposalUpdate
)
from app.core.dependencies import get_current_user
from app.models.user import User
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timezone
from app.services.ai_service import ai_service
import os
import uuid as uuid_lib

router = APIRouter(prefix="/proposals", tags=["Proposals"])


@router.get("/", response_model=ProposalListResponse)
async def list_proposals(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    rfp_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    min_score: Optional[float] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List proposals with filters."""
    # Get RFPs owned by current user
    rfp_ids_query = select(Rfp.id).where(Rfp.created_by == current_user.id)
    rfp_ids_result = await db.execute(rfp_ids_query)
    user_rfp_ids = [r[0] for r in rfp_ids_result.fetchall()]
    
    query = select(Proposal).where(Proposal.rfp_id.in_(user_rfp_ids))
    
    if rfp_id:
        query = query.where(Proposal.rfp_id == rfp_id)
    if status_filter:
        query = query.where(Proposal.status == status_filter)
    if min_score is not None:
        query = query.where(Proposal.ai_score >= min_score)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Proposal.submitted_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    proposals = result.scalars().all()
    
    # Enrich with vendor and rfp names
    items = []
    for p in proposals:
        vendor_result = await db.execute(select(Vendor.name).where(Vendor.id == p.vendor_id))
        vendor_name = vendor_result.scalar_one_or_none()
        rfp_result = await db.execute(select(Rfp.title).where(Rfp.id == p.rfp_id))
        rfp_title = rfp_result.scalar_one_or_none()
        
        proposal_dict = ProposalPublic.model_validate(p)
        proposal_dict.vendor_name = vendor_name
        proposal_dict.rfp_title = rfp_title
        items.append(proposal_dict)
    
    return ProposalListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{proposal_id}", response_model=ProposalPublic)
async def get_proposal(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific proposal."""
    # Verify ownership via RFP
    result = await db.execute(
        select(Proposal)
        .join(Rfp, Proposal.rfp_id == Rfp.id)
        .where(Proposal.id == proposal_id, Rfp.created_by == current_user.id)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Get vendor name
    vendor_result = await db.execute(select(Vendor.name).where(Vendor.id == proposal.vendor_id))
    vendor_name = vendor_result.scalar_one_or_none()
    
    proposal_dict = ProposalPublic.model_validate(proposal)
    proposal_dict.vendor_name = vendor_name
    return proposal_dict


@router.patch("/{proposal_id}/status", response_model=ProposalPublic)
async def update_proposal_status(
    proposal_id: UUID,
    status_data: dict,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update proposal status."""
    new_status = status_data.get("status")
    if new_status not in ["pending", "under_review", "scored", "shortlisted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Verify ownership
    result = await db.execute(
        select(Proposal)
        .join(Rfp, Proposal.rfp_id == Rfp.id)
        .where(Proposal.id == proposal_id, Rfp.created_by == current_user.id)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal.status = new_status
    await db.flush()
    
    # Get vendor name for activity
    vendor_result = await db.execute(select(Vendor.name).where(Vendor.id == proposal.vendor_id))
    vendor_name = vendor_result.scalar_one_or_none()
    
    # Log activity
    activity = Activity(
        user_id=current_user.id,
        actor_name=current_user.full_name,
        action="updated_status",
        target=f"Proposal from {vendor_name} to {new_status}",
    )
    db.add(activity)
    
    return ProposalPublic.model_validate(proposal)


@router.get("/compare", response_model=ProposalComparisonResponse)
async def compare_proposals(
    ids: str = Query(..., description="Comma-separated proposal IDs"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Compare proposals side-by-side."""
    proposal_ids = [UUID(id.strip()) for id in ids.split(",")]
    
    # Verify ownership
    result = await db.execute(
        select(Proposal)
        .join(Rfp, Proposal.rfp_id == Rfp.id)
        .where(Proposal.id.in_(proposal_ids), Rfp.created_by == current_user.id)
    )
    proposals = result.scalars().all()
    
    comparison_items = []
    for p in proposals:
        vendor_result = await db.execute(select(Vendor.name).where(Vendor.id == p.vendor_id))
        vendor_name = vendor_result.scalar_one_or_none()
        
        item = ProposalComparisonItem(
            id=p.id,
            vendor_name=vendor_name or "Unknown",
            amount=float(p.amount) if p.amount else None,
            ai_score=float(p.ai_score) if p.ai_score else None,
            technical_score=float(p.technical_score) if p.technical_score else None,
            pricing_score=float(p.pricing_score) if p.pricing_score else None,
            experience_score=float(p.experience_score) if p.experience_score else None,
            ai_summary=p.ai_summary,
        )
        comparison_items.append(item)
    
    return ProposalComparisonResponse(proposals=comparison_items)


@router.post("/{proposal_id}/score", status_code=status.HTTP_202_ACCEPTED)
async def score_proposal(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI scoring for a proposal (background task)."""
    # Verify ownership
    result = await db.execute(
        select(Proposal, Rfp, Vendor)
        .join(Rfp, Proposal.rfp_id == Rfp.id)
        .join(Vendor, Proposal.vendor_id == Vendor.id)
        .where(Proposal.id == proposal_id, Rfp.created_by == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal, rfp, vendor = row
    
    # Run scoring (in production, this would be a Celery task)
    scores = await ai_service.score_proposal(
        rfp_title=rfp.title,
        proposal_content=f"Amount: {proposal.amount}\nVendor: {vendor.name}",
    )
    
    proposal.ai_score = scores["ai_score"]
    proposal.technical_score = scores["technical_score"]
    proposal.pricing_score = scores["pricing_score"]
    proposal.experience_score = scores["experience_score"]
    proposal.ai_summary = scores["ai_summary"]
    proposal.status = ProposalStatus.SCORED
    proposal.scored_at = datetime.now(timezone.utc)
    
    await db.flush()
    
    # Create notification
    notification = Notification(
        user_id=current_user.id,
        notification_type=NotificationType.AI,
        title="AI Scoring Complete",
        body=f"Proposal from {vendor.name} has been scored: {scores['ai_score']:.1f}",
        related_rfp_id=rfp.id,
    )
    db.add(notification)
    
    # Create activity
    activity = Activity(
        user_id=current_user.id,
        actor_name="AI Assistant",
        action="scored",
        target=f"Proposal from {vendor.name}",
    )
    db.add(activity)
    
    return {"job_id": str(uuid_lib.uuid4()), "message": "Scoring complete"}
