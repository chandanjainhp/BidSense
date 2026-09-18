from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db_session
from app.models.rfp import Rfp, RfpInvitation, InvitationStatus, RfpEvent, RfpEventType
from app.models.vendor import Vendor
from app.models.proposal import Proposal, ProposalStatus
from app.models.notification import Notification, NotificationType
from uuid import UUID
from datetime import datetime, timezone
import os
import uuid as uuid_lib
from app.core.config import settings

router = APIRouter(prefix="/invitations", tags=["Public Invitations"])


@router.get("/{token}")
async def get_invitation(
    token: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get invitation details by token (public, no auth)."""
    result = await db.execute(
        select(RfpInvitation)
        .join(Rfp, RfpInvitation.rfp_id == Rfp.id)
        .join(Vendor, RfpInvitation.vendor_id == Vendor.id)
        .where(RfpInvitation.invitation_token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    return {
        "id": str(invitation.id),
        "rfp_id": str(invitation.rfp_id),
        "rfp_title": invitation.rfp.title,
        "rfp_description": invitation.rfp.description,
        "rfp_due_date": invitation.rfp.due_date,
        "vendor_name": invitation.vendor.name,
        "status": invitation.status.value,
        "invited_at": invitation.invited_at,
    }


@router.post("/{token}/view")
async def mark_invitation_viewed(
    token: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Mark invitation as viewed (analytics funnel step)."""
    result = await db.execute(
        select(RfpInvitation).where(RfpInvitation.invitation_token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation.status == InvitationStatus.INVITED:
        invitation.status = InvitationStatus.VIEWED
        invitation.viewed_at = datetime.now(timezone.utc)
        await db.flush()
    
    return {"message": "Invitation marked as viewed", "status": invitation.status.value}


@router.post("/{token}/proposal")
async def submit_proposal(
    token: str,
    amount: float = Form(...),
    message: str | None = Form(None),
    document: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db_session),
):
    """Vendor submits a proposal (public, no auth)."""
    result = await db.execute(
        select(RfpInvitation, Rfp, Vendor)
        .join(Rfp, RfpInvitation.rfp_id == Rfp.id)
        .join(Vendor, RfpInvitation.vendor_id == Vendor.id)
        .where(RfpInvitation.invitation_token == token)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    invitation, rfp, vendor = row
    
    # Save document if provided
    document_url = None
    if document:
        contents = await document.read()
        file_ext = document.filename.split(".")[-1] if "." in document.filename else "pdf"
        filename = f"{uuid_lib.uuid4()}.{file_ext}"
        filepath = os.path.join(settings.MEDIA_ROOT, "proposals", filename)
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(contents)
        
        document_url = f"/media/proposals/{filename}"
    
    # Create proposal
    proposal = Proposal(
        rfp_id=rfp.id,
        vendor_id=vendor.id,
        amount=amount,
        status=ProposalStatus.PENDING,
        document_url=document_url,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(proposal)
    
    # Update invitation status
    invitation.status = InvitationStatus.SUBMITTED
    invitation.submitted_at = datetime.now(timezone.utc)
    
    # Create notification for RFP owner
    notification = Notification(
        user_id=rfp.created_by,
        notification_type=NotificationType.RFP,
        title="New Proposal Received",
        body=f"New proposal received from {vendor.name} for {rfp.title}",
        related_rfp_id=rfp.id,
    )
    db.add(notification)
    
    # Create RFP event
    event = RfpEvent(
        rfp_id=rfp.id,
        actor_type=RfpEventType.VENDOR,
        actor_name=vendor.name,
        action="submitted_proposal",
        detail=f"Vendor {vendor.name} submitted a proposal",
    )
    db.add(event)
    
    await db.flush()
    
    return {
        "message": "Proposal submitted successfully",
        "proposal_id": str(proposal.id),
    }
