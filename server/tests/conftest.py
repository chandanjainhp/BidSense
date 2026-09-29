"""Shared fixtures for vendor marketplace tests (async, against the real Postgres)."""
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

import app.db.base as _db_base

# Swap the global engine for a NullPool engine so connections never leak
# across event loops (each checkout gets a fresh connection on the current loop).
_test_engine = create_async_engine(
    _db_base.engine.url,
    echo=False,
    poolclass=NullPool,
    connect_args=_db_base.connect_args,
)
_db_base.engine = _test_engine
_db_base.async_session_factory = async_sessionmaker(
    _test_engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False,
)

from app.main import app
from app.db.base import async_session_factory, engine, Base
from app.models.user import User
from app.models.otp import OtpCode
from app.models.vendor_profile import VendorProfile, VendorProfileStatus
from app.models.product import Product, VendorService, ListingStatus
from app.models.bulk_pricing import BulkPricing, BulkSale, VendorInquiry
from app.models.quotation import Quotation, QuotationItem
from app.models.order import Order
from app.core.security import get_password_hash, create_access_token

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(scope="session")
async def _create_tables():
    """Ensure every table exists before the test session starts."""
    async with engine.begin() as conn:
        from app.models import (  # noqa: F401
            user, vendor, rfp, proposal, chat, notification, activity, settings, otp, document,
            vendor_profile, product, bulk_pricing, quotation, order,
        )
        await conn.run_sync(Base.metadata.create_all)
    yield
    await _test_engine.dispose()


@pytest_asyncio.fixture
async def db(_create_tables):
    """A clean-session fixture that wipes marketplace rows before each test."""
    async with async_session_factory() as session:
        # Clean marketplace data for isolation (users too — tests create fresh ones)
        from sqlalchemy import delete as _delete
        for model in (Order, QuotationItem, Quotation, VendorInquiry, BulkSale, BulkPricing,
                      Product, VendorService, VendorProfile, OtpCode, User):
            await session.execute(_delete(model))
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def client(_create_tables):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _make_user(db, email: str, password: str = "Passw0rd!") -> User:
    user = User(
        full_name="Test User",
        email=email,
        hashed_password=get_password_hash(password),
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def vendor_user(db):
    return await _make_user(db, "vendor-owner@test.io")


@pytest_asyncio.fixture
async def buyer_user(db):
    return await _make_user(db, "buyer@test.io")


@pytest_asyncio.fixture
async def other_vendor_user(db):
    return await _make_user(db, "other-vendor@test.io")


@pytest_asyncio.fixture
async def auth_headers(vendor_user):
    token = create_access_token(data={"sub": str(vendor_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def buyer_headers(buyer_user):
    token = create_access_token(data={"sub": str(buyer_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def vendor_profile(db, vendor_user):
    vp = VendorProfile(
        user_id=vendor_user.id,
        business_name="Acme Industrial",
        contact_name="Owner",
        contact_email="vendor-owner@test.io",
        contact_phone="9876543210",
        business_category="Safety Equipment",
        status=VendorProfileStatus.VERIFIED,
        city="Mumbai",
        service_areas=["Mumbai"],
    )
    db.add(vp)
    await db.commit()
    await db.refresh(vp)
    return vp


@pytest_asyncio.fixture
async def other_vendor_profile(db, other_vendor_user):
    vp = VendorProfile(
        user_id=other_vendor_user.id,
        business_name="Rival Supplies",
        contact_name="Rival",
        contact_email="other-vendor@test.io",
        contact_phone="9876543211",
        business_category="Tools",
        status=VendorProfileStatus.VERIFIED,
    )
    db.add(vp)
    await db.commit()
    await db.refresh(vp)
    return vp


@pytest_asyncio.fixture
async def published_product(db, vendor_profile):
    p = Product(
        vendor_id=vendor_profile.id,
        name="Industrial Gloves",
        category="Safety Equipment",
        price=500,
        stock=1000,
        unit="box",
        moq=1,
        status=ListingStatus.PUBLISHED,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


VENDOR_REGISTER_PAYLOAD = {
    "full_name": "New Vendor",
    "email": "new-vendor@test.io",
    "password": "Vendor@123",
    "business_name": "Fresh Supplies Co",
    "contact_name": "Fresh Owner",
    "phone": "9876543210",
    "gstin": "27ABCDE1234F1Z5",
    "pan": "ABCDE1234F",
    "business_category": "Packaging",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "service_areas": ["Pune"],
}
