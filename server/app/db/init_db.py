import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy import select, text
from app.db.base import engine, async_session_factory, Base
from app.models.user import User
from app.models.otp import OtpCode, OtpPurpose


async def init_db():
    """Initialize the database - create all tables and seed data."""
    async with engine.begin() as conn:
        # Import all models to ensure they're registered with Base
        from app.models import user, vendor, rfp, proposal, chat, notification, activity, settings, otp
        
        await conn.run_sync(Base.metadata.create_all)
    
    print("Database tables created successfully!")
    
    # Create seed data
    async with async_session_factory() as session:
        from app.core.security import get_password_hash, hash_otp, generate_otp
        
        # Create demo verified user
        result = await session.execute(select(User).where(User.email == "demo@bidsense.io"))
        demo_user = result.scalar_one_or_none()
        
        if not demo_user:
            demo_user = User(
                full_name="Demo User",
                email="demo@bidsense.io",
                hashed_password=get_password_hash("Demo@1234"),
                is_verified=True,
                last_login_at=datetime.now(timezone.utc),
            )
            session.add(demo_user)
            await session.flush()
            print("Demo user created: demo@bidsense.io / Demo@1234")
        else:
            print("Demo user already exists.")
        
        # Create some vendors for dashboard stats
        from app.models.vendor import Vendor
        
        vendor_data = [
            {"name": "TechFlow Solutions", "industry": "Technology", "email": "contact@techflow.com", "contact_name": "John Smith", "status": "active"},
            {"name": "CloudScale Inc", "industry": "Cloud Services", "email": "hello@cloudscale.io", "contact_name": "Sarah Johnson", "status": "active"},
            {"name": "DataPrime Systems", "industry": "Data Analytics", "email": "info@dataprime.com", "contact_name": "Mike Chen", "status": "active"},
            {"name": "SecureNet Labs", "industry": "Cybersecurity", "email": "sales@securenet.com", "contact_name": "Emily Davis", "status": "pending"},
            {"name": "InfraCore Partners", "industry": "Infrastructure", "email": "contact@infracore.com", "contact_name": "Robert Wilson", "status": "inactive"},
        ]
        
        for vd in vendor_data:
            result = await session.execute(select(Vendor).where(Vendor.email == vd["email"]))
            if not result.scalar_one_or_none():
                vendor = Vendor(
                    owner_user_id=demo_user.id,
                    name=vd["name"],
                    industry=vd["industry"],
                    email=vd["email"],
                    contact_name=vd["contact_name"],
                    status=vd["status"],
                    website=f"https://{vd['name'].lower().replace(' ', '')}.com",
                )
                session.add(vendor)
        
        await session.flush()
        print("Vendors seeded.")
        
        # Create some RFPs
        from app.models.rfp import Rfp, RfpStatus
        
        rfp_data = [
            {"title": "Cloud Infrastructure Migration", "type": "Infrastructure", "department": "IT", "budget": Decimal("500000.00"), "status": RfpStatus.OPEN},
            {"title": "Cybersecurity Assessment", "type": "Security", "department": "Security", "budget": Decimal("150000.00"), "status": RfpStatus.OPEN},
            {"title": "Data Analytics Platform", "type": "Software", "department": "Analytics", "budget": Decimal("750000.00"), "status": RfpStatus.DRAFT},
            {"title": "Network Upgrade Project", "type": "Infrastructure", "department": "IT", "budget": Decimal("300000.00"), "status": RfpStatus.CLOSED},
        ]
        
        for rd in rfp_data:
            result = await session.execute(select(Rfp).where(Rfp.title == rd["title"]))
            if not result.scalar_one_or_none():
                rfp = Rfp(
                    created_by=demo_user.id,
                    title=rd["title"],
                    rfp_type=rd["type"],
                    department=rd["department"],
                    budget=rd["budget"],
                    due_date=datetime.utcnow() + timedelta(days=30),
                    description=f"RFP for {rd['title'].lower()}",
                    status=rd["status"],
                    document={"sections": []},
                )
                session.add(rfp)
        
        await session.flush()
        print("RFPs seeded.")
        
        # Create some proposals
        from app.models.proposal import Proposal, ProposalStatus
        
        # Get vendors and rfps for foreign keys
        vendors_result = await session.execute(select(Vendor))
        vendors = vendors_result.scalars().all()
        
        rfps_result = await session.execute(select(Rfp))
        rfps = rfps_result.scalars().all()
        
        proposal_data = [
            {"rfp_title": "Cloud Infrastructure Migration", "vendor_name": "TechFlow Solutions", "amount": Decimal("480000.00"), "status": ProposalStatus.SCORED, "ai_score": 87.5},
            {"rfp_title": "Cloud Infrastructure Migration", "vendor_name": "CloudScale Inc", "amount": Decimal("520000.00"), "status": ProposalStatus.UNDER_REVIEW, "ai_score": None},
            {"rfp_title": "Cybersecurity Assessment", "vendor_name": "SecureNet Labs", "amount": Decimal("145000.00"), "status": ProposalStatus.PENDING, "ai_score": None},
            {"rfp_title": "Data Analytics Platform", "vendor_name": "DataPrime Systems", "amount": Decimal("720000.00"), "status": ProposalStatus.SCORED, "ai_score": 92.0},
        ]
        
        for pd in proposal_data:
            rfp = next((r for r in rfps if r.title == pd["rfp_title"]), None)
            vendor = next((v for v in vendors if v.name == pd["vendor_name"]), None)
            
            if rfp and vendor:
                result = await session.execute(
                    select(Proposal).where(
                        (Proposal.rfp_id == rfp.id) & (Proposal.vendor_id == vendor.id)
                    )
                )
                if not result.scalar_one_or_none():
                    proposal = Proposal(
                        rfp_id=rfp.id,
                        vendor_id=vendor.id,
                        amount=pd["amount"],
                        status=pd["status"],
                        ai_score=pd["ai_score"],
                        ai_summary=f"AI evaluation for {pd['vendor_name']}'s proposal" if pd["ai_score"] else None,
                        technical_score=85.0 if pd["ai_score"] else None,
                        pricing_score=90.0 if pd["ai_score"] else None,
                        experience_score=88.0 if pd["ai_score"] else None,
                    )
                    session.add(proposal)
        
        await session.flush()
        print("Proposals seeded.")
        
        # Create some activities
        from app.models.activity import Activity
        
        activities = [
            {"actor_name": "Demo User", "action": "created", "target": "Cloud Infrastructure Migration RFP"},
            {"actor_name": "AI Assistant", "action": "scored", "target": "TechFlow Solutions proposal"},
            {"actor_name": "Demo User", "action": "invited", "target": "5 vendors to Cloud Infrastructure Migration"},
            {"actor_name": "System", "action": "published", "target": "Cybersecurity Assessment RFP"},
        ]
        
        for act in activities:
            activity = Activity(
                user_id=demo_user.id,
                actor_name=act["actor_name"],
                action=act["action"],
                target=act["target"],
            )
            session.add(activity)
        
        await session.commit()
        print("Activities seeded.")
        
        print("\n=== Seed data complete ===")
        print("Login with: demo@bidsense.io / Demo@1234")


if __name__ == "__main__":
    asyncio.run(init_db())
