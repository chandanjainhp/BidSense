from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db_session
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics."""
    from sqlalchemy import select, func
    from app.models.rfp import Rfp
    from app.models.vendor import Vendor
    from app.models.proposal import Proposal
    
    # Count total RFPs
    rfp_count_result = await db.execute(select(func.count()).select_from(Rfp))
    total_rfps = rfp_count_result.scalar() or 0
    
    # Count active vendors
    active_vendors_result = await db.execute(
        select(func.count()).select_from(Vendor).where(Vendor.status == "active")
    )
    active_vendors = active_vendors_result.scalar() or 0
    
    # Count proposals received
    proposals_result = await db.execute(select(func.count()).select_from(Proposal))
    proposals_received = proposals_result.scalar() or 0
    
    # Count AI-scored proposals
    ai_scored_result = await db.execute(
        select(func.count()).select_from(Proposal).where(Proposal.ai_score.isnot(None))
    )
    ai_scored = ai_scored_result.scalar() or 0
    
    return {
        "stats": [
            {"label": "Total RFPs", "value": total_rfps, "icon": "/rfp-icon.svg", "color": "blue", "bg": "blue-100", "link": "/rfps"},
            {"label": "Active Vendors", "value": active_vendors, "icon": "/vendor-icon.svg", "color": "green", "bg": "green-100", "link": "/vendors"},
            {"label": "Proposals Received", "value": proposals_received, "icon": "/proposal-icon.svg", "color": "purple", "bg": "purple-100", "link": "/proposals"},
            {"label": "AI-Scored Proposals", "value": ai_scored, "icon": "/ai-icon.svg", "color": "orange", "bg": "orange-100", "link": "/proposals"},
        ]
    }


@router.get("/activity")
async def get_activity(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get recent activity feed."""
    from sqlalchemy import select
    from app.models.activity import Activity
    
    result = await db.execute(
        select(Activity)
        .order_by(Activity.created_at.desc())
        .limit(20)
    )
    activities = result.scalars().all()
    
    return {
        "activities": [
            {
                "id": str(a.id),
                "user": a.actor_name,
                "action": a.action,
                "target": a.target,
                "time": a.created_at.isoformat(),
                "icon": a.icon if hasattr(a, 'icon') else "default",
            }
            for a in activities
        ]
    }
