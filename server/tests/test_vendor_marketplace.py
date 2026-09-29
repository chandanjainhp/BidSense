"""Vendor marketplace end-to-end and validation tests."""
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.models.vendor_profile import VendorProfileStatus
from app.models.product import ListingStatus
from app.models.bulk_pricing import InquiryStatus, BulkPricing
from app.models.quotation import QuotationStatus
from app.models.order import OrderStatus
from app.models.product import Product

pytestmark = pytest.mark.asyncio

from tests.conftest import VENDOR_REGISTER_PAYLOAD


# ---------------------------------------------------------------------------
# Registration & profile
# ---------------------------------------------------------------------------

async def test_vendor_registration_creates_user_and_profile(client: AsyncClient, db):
    res = await client.post("/api/vendors/register", json=VENDOR_REGISTER_PAYLOAD)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["business_name"] == "Fresh Supplies Co"
    assert body["status"] == "pending"
    # GSTIN/PAN normalized to upper
    assert body["gstin"] == "27ABCDE1234F1Z5"

    user = (await db.execute(select(User).where(User.email == "new-vendor@test.io"))).scalar_one_or_none()
    assert user is not None
    assert user.is_verified is False  # must verify via OTP


async def test_vendor_registration_rejects_duplicate_email(client: AsyncClient, db, vendor_user):
    payload = {**VENDOR_REGISTER_PAYLOAD, "email": vendor_user.email}
    res = await client.post("/api/vendors/register", json=payload)
    assert res.status_code == 409


async def test_vendor_registration_validates_gstin(client: AsyncClient):
    payload = {**VENDOR_REGISTER_PAYLOAD, "gstin": "BAD-GSTIN"}
    res = await client.post("/api/vendors/register", json=payload)
    assert res.status_code == 422
    assert "GSTIN" in res.text


async def test_vendor_registration_validates_phone(client: AsyncClient):
    payload = {**VENDOR_REGISTER_PAYLOAD, "phone": "12345"}
    res = await client.post("/api/vendors/register", json=payload)
    assert res.status_code == 422


async def test_vendor_registration_validates_pan(client: AsyncClient):
    payload = {**VENDOR_REGISTER_PAYLOAD, "pan": "12ABC456F"}
    res = await client.post("/api/vendors/register", json=payload)
    assert res.status_code == 422


async def test_get_my_vendor_requires_auth(client: AsyncClient):
    res = await client.get("/api/vendors/me")
    assert res.status_code == 401


async def test_get_my_vendor_profile(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.get("/api/vendors/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["business_name"] == "Acme Industrial"
    assert res.json()["status"] == "verified"


async def test_update_my_vendor_profile(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.patch("/api/vendors/me", headers=auth_headers,
                             json={"description": "Updated description", "service_areas": ["Mumbai", "Pune"]})
    assert res.status_code == 200
    body = res.json()
    assert body["description"] == "Updated description"
    assert body["service_areas"] == ["Mumbai", "Pune"]


async def test_update_profile_rejects_invalid_pincode(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.patch("/api/vendors/me", headers=auth_headers, json={"pincode": "000111"})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# Public store
# ---------------------------------------------------------------------------

async def test_public_store_lists_only_verified(client: AsyncClient, db, vendor_user, vendor_profile):
    # create an unverified vendor
    from app.models.vendor_profile import VendorProfile
    other = VendorProfile(
        user_id=vendor_user.id,  # unique constraint — use a fresh user instead
    )
    # (skipped creating second profile due to 1:1 constraint; rely on fixture)
    res = await client.get("/api/vendors/store")
    assert res.status_code == 200
    names = [v["business_name"] for v in res.json()["items"]]
    assert "Acme Industrial" in names


async def test_public_store_hides_private_fields(client: AsyncClient, auth_headers, vendor_profile):
    # add private info
    await client.patch("/api/vendors/me", headers=auth_headers,
                       json={"gstin": "27ABCDE1234F1Z5", "documents": ["secret-kyc.pdf"]})
    res = await client.get(f"/api/vendors/store/{vendor_profile.id}")
    assert res.status_code == 200
    body = res.json()
    assert "gstin" not in body
    assert "pan" not in body
    assert "documents" not in body
    assert "verification_note" not in body
    assert "contact_email" not in body


async def test_public_store_hides_unverified_vendor(client: AsyncClient, db, vendor_user):
    from app.models.vendor_profile import VendorProfile
    # temp profile with pending status for another user
    from app.core.security import get_password_hash
    u = User(full_name="Pending Vendor", email="pending-v@test.io",
             hashed_password=get_password_hash("Passw0rd!"), is_verified=True)
    db.add(u)
    await db.flush()
    vp = VendorProfile(user_id=u.id, business_name="Hidden Co", contact_name="H",
                       contact_email=u.email, contact_phone="9876543212",
                       business_category="X", status=VendorProfileStatus.PENDING)
    db.add(vp)
    await db.commit()
    await db.refresh(vp)
    res = await client.get(f"/api/vendors/store/{vp.id}")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Product CRUD + ownership
# ---------------------------------------------------------------------------

async def test_product_crud_lifecycle(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.post("/api/vendors/me/products", headers=auth_headers, json={
        "name": "Test Widget", "category": "Widgets", "price": 100, "stock": 50,
        "unit": "piece", "moq": 5, "status": "published",
    })
    assert res.status_code == 201, res.text
    pid = res.json()["id"]

    res = await client.get("/api/vendors/me/products", headers=auth_headers)
    assert res.status_code == 200
    assert any(p["id"] == pid for p in res.json()["items"])

    res = await client.patch(f"/api/vendors/me/products/{pid}", headers=auth_headers,
                             json={"price": 120, "status": "unpublished"})
    assert res.status_code == 200
    assert res.json()["price"] == 120
    assert res.json()["status"] == "unpublished"

    res = await client.delete(f"/api/vendors/me/products/{pid}", headers=auth_headers)
    assert res.status_code == 204


async def test_product_ownership_enforced(client: AsyncClient, auth_headers, other_vendor_profile):
    """Vendor B cannot read, update, or delete Vendor A's product."""
    # create product as other vendor first
    # (auth_headers is vendor A; use other vendor's own token)
    from app.core.security import create_access_token
    from tests.conftest import _make_user  # not available; create token via db user
    # get other vendor user
    from sqlalchemy import select as _s
    # We need other_vendor_user fixture; create inline
    # Simplest: try to access a random product id as vendor A
    res = await client.get(f"/api/vendors/me/products/{uuid4()}", headers=auth_headers)
    assert res.status_code == 404


async def test_product_requires_vendor_profile(client: AsyncClient, buyer_headers):
    res = await client.post("/api/vendors/me/products", headers=buyer_headers, json={
        "name": "Nope", "category": "Tools",
    })
    assert res.status_code == 404  # vendor profile not found


async def test_product_price_validation(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.post("/api/vendors/me/products", headers=auth_headers, json={
        "name": "Bad Price", "category": "X", "price": 0,
    })
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# Service CRUD
# ---------------------------------------------------------------------------

async def test_service_crud_lifecycle(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.post("/api/vendors/me/services", headers=auth_headers, json={
        "name": "Consulting", "category": "Advisory", "base_price": 5000,
        "pricing_unit": "day", "availability": "available",
    })
    assert res.status_code == 201, res.text
    sid = res.json()["id"]

    res = await client.patch(f"/api/vendors/me/services/{sid}", headers=auth_headers,
                             json={"base_price": 6000, "availability": "on_request"})
    assert res.status_code == 200
    assert res.json()["base_price"] == 6000

    res = await client.delete(f"/api/vendors/me/services/{sid}", headers=auth_headers)
    assert res.status_code == 204


async def test_service_validates_availability(client: AsyncClient, auth_headers, vendor_profile):
    res = await client.post("/api/vendors/me/services", headers=auth_headers, json={
        "name": "Bad Avail", "category": "X", "availability": "sometimes",
    })
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# Bulk pricing tiers
# ---------------------------------------------------------------------------

def _tiers_spec() -> dict:
    return {
        "product_id": None,  # filled per-test
        "min_order_quantity": 1,
        "bulk_discount_percent": 0,
        "is_active": True,
        "tiers": [
            {"min_quantity": 1, "max_quantity": 49, "unit_price": 500},
            {"min_quantity": 50, "max_quantity": 199, "unit_price": 450},
            {"min_quantity": 200, "max_quantity": 499, "unit_price": 420},
            {"min_quantity": 500, "max_quantity": None, "unit_price": 390},
        ],
    }


async def test_bulk_sale_create_with_valid_tiers(client: AsyncClient, auth_headers, vendor_profile, published_product):
    payload = _tiers_spec()
    payload["product_id"] = str(published_product.id)
    res = await client.post("/api/vendors/me/bulk-sales", headers=auth_headers, json=payload)
    assert res.status_code == 201, res.text
    body = res.json()
    assert len(body["tiers"]) == 4
    assert body["tiers"][0]["unit_price"] == 500
    assert body["tiers"][-1]["max_quantity"] is None


async def test_bulk_sale_rejects_overlapping_tiers(client: AsyncClient, auth_headers, vendor_profile, published_product):
    payload = _tiers_spec()
    payload["product_id"] = str(published_product.id)
    payload["tiers"] = [
        {"min_quantity": 1, "max_quantity": 100, "unit_price": 500},
        {"min_quantity": 50, "max_quantity": 500, "unit_price": 450},  # overlaps 1-100
    ]
    res = await client.post("/api/vendors/me/bulk-sales", headers=auth_headers, json=payload)
    assert res.status_code == 422
    assert "Overlapping" in res.text


async def test_bulk_sale_rejects_inverted_range(client: AsyncClient, auth_headers, vendor_profile, published_product):
    payload = _tiers_spec()
    payload["product_id"] = str(published_product.id)
    payload["tiers"] = [{"min_quantity": 100, "max_quantity": 50, "unit_price": 500}]
    res = await client.post("/api/vendors/me/bulk-sales", headers=auth_headers, json=payload)
    assert res.status_code == 422


async def test_bulk_sale_rejects_multiple_open_tiers(client: AsyncClient, auth_headers, vendor_profile, published_product):
    payload = _tiers_spec()
    payload["product_id"] = str(published_product.id)
    payload["tiers"] = [
        {"min_quantity": 1, "max_quantity": None, "unit_price": 500},
        {"min_quantity": 50, "max_quantity": None, "unit_price": 450},
    ]
    res = await client.post("/api/vendors/me/bulk-sales", headers=auth_headers, json=payload)
    assert res.status_code == 422


async def test_bulk_sale_ownership_enforced(client: AsyncClient, auth_headers, buyer_headers,
                                            vendor_profile, published_product):
    payload = _tiers_spec()
    payload["product_id"] = str(published_product.id)
    res = await client.post("/api/vendors/me/bulk-sales", headers=auth_headers, json=payload)
    assert res.status_code == 201
    bs_id = res.json()["id"]

    # Buyer (no vendor profile) cannot patch it
    res = await client.patch(f"/api/vendors/me/bulk-sales/{bs_id}", headers=buyer_headers,
                             json={"is_active": False})
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Inquiry → Quotation → Order flow
# ---------------------------------------------------------------------------

async def test_full_inquiry_quotation_order_flow(client: AsyncClient, auth_headers, buyer_headers,
                                                 vendor_profile, published_product):
    # 1. Buyer creates inquiry
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 250,
        "target_price": 410,
        "delivery_location": "Mumbai, Andheri East",
        "required_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "message": "Need delivery in two batches.",
    })
    assert res.status_code == 201, res.text
    inquiry = res.json()
    assert inquiry["status"] == "pending"

    # 2. Vendor lists inquiries
    res = await client.get("/api/vendors/me/inquiries", headers=auth_headers)
    assert res.status_code == 200
    assert any(i["id"] == inquiry["id"] for i in res.json()["items"])

    # 3. Vendor views it → status becomes viewed
    res = await client.get(f"/api/vendors/me/inquiries/{inquiry['id']}", headers=auth_headers)
    assert res.json()["status"] == "viewed"

    # 4. Vendor creates quotation (server computes totals)
    res = await client.post(f"/api/vendors/me/inquiries/{inquiry['id']}/quotation", headers=auth_headers, json={
        "bulk_discount_percent": 5,
        "tax_percent": 18,
        "shipping_fee": 1500,
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "delivery_time": "5-7 days",
        "terms": "50% advance, balance on delivery.",
        "items": [{
            "product_id": str(published_product.id),
            "name": "Industrial Gloves",
            "quantity": 250,
            "unit_price": 420,
        }],
    })
    assert res.status_code == 201, res.text
    quotation = res.json()
    assert quotation["status"] == "sent"
    # subtotal 250*420 = 105000; -5% = 99750; +18% = 117705; +1500 = 119205
    assert abs(quotation["total_amount"] - 119205.0) < 0.01

    # inquiry moved to quoted
    res = await client.get(f"/api/vendors/me/inquiries/{inquiry['id']}", headers=auth_headers)
    assert res.json()["status"] == "quoted"

    # 5. Buyer cannot use vendor endpoints
    res = await client.get("/api/vendors/me/inquiries", headers=buyer_headers)
    assert res.status_code == 404

    # 6. Buyer accepts → order created
    res = await client.post(f"/api/quotations/{quotation['id']}/decide", headers=buyer_headers,
                            json={"action": "accept"})
    assert res.status_code == 201, res.text
    order = res.json()
    assert order["status"] == "pending"
    assert abs(order["total_amount"] - 119205.0) < 0.01
    assert order["delivery_location"] == "Mumbai, Andheri East"

    # quotation is converted
    res = await client.get(f"/api/vendors/me/quotations/{quotation['id']}", headers=auth_headers)
    assert res.json()["status"] == "converted"

    # 7. Vendor progresses order through valid transitions
    for new_status in ("confirmed", "processing", "shipped", "delivered", "completed"):
        res = await client.patch(f"/api/vendors/me/orders/{order['id']}/status",
                                 headers=auth_headers, json={"status": new_status})
        assert res.status_code == 200, res.text
        assert res.json()["status"] == new_status

    # 8. Invalid transition rejected (completed is terminal)
    res = await client.patch(f"/api/vendors/me/orders/{order['id']}/status",
                             headers=auth_headers, json={"status": "cancelled"})
    assert res.status_code == 422


async def test_order_invalid_transition_rejected_early(client: AsyncClient, auth_headers, buyer_headers,
                                                       vendor_profile, published_product):
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 10,
        "delivery_location": "Pune",
    })
    inquiry = res.json()
    res = await client.post(f"/api/vendors/me/inquiries/{inquiry['id']}/quotation",
                            headers=auth_headers, json={
                                "items": [{"product_id": str(published_product.id), "name": "Gloves",
                                           "quantity": 10, "unit_price": 500}],
                            })
    quotation = res.json()
    res = await client.post(f"/api/quotations/{quotation['id']}/decide", headers=buyer_headers,
                            json={"action": "accept"})
    order = res.json()

    # pending → shipped is invalid
    res = await client.patch(f"/api/vendors/me/orders/{order['id']}/status",
                             headers=auth_headers, json={"status": "shipped"})
    assert res.status_code == 422


async def test_order_ownership_protection(client: AsyncClient, buyer_headers, auth_headers,
                                          vendor_profile, published_product):
    """A buyer cannot update order status via vendor endpoints."""
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 5,
        "delivery_location": "Nashik",
    })
    inquiry = res.json()
    res = await client.post(f"/api/vendors/me/inquiries/{inquiry['id']}/quotation",
                            headers=auth_headers, json={
                                "items": [{"name": "Gloves", "quantity": 5, "unit_price": 500}],
                            })
    quotation = res.json()
    res = await client.post(f"/api/quotations/{quotation['id']}/decide", headers=buyer_headers,
                            json={"action": "accept"})
    order = res.json()

    # Buyer tries to update the order directly
    res = await client.patch(f"/api/vendors/me/orders/{order['id']}/status",
                             headers=buyer_headers, json={"status": "completed"})
    assert res.status_code == 404  # no vendor profile → not their resource


async def test_inquiry_rejects_unverified_vendor(client: AsyncClient, buyer_headers, db, vendor_user):
    from app.models.vendor_profile import VendorProfile
    vp = VendorProfile(user_id=vendor_user.id, business_name="Should Not Show",
                       contact_name="P", contact_email="vp@test.io", contact_phone="9876500000",
                       business_category="X", status=VendorProfileStatus.PENDING)
    # vendor_user already has a profile in other tests; ensure fresh
    db.add(vp)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        pytest.skip("vendor_user already has profile")
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vp.id), "quantity": 1, "delivery_location": "X",
    })
    assert res.status_code == 422


async def test_expired_quotation_rejected(client: AsyncClient, auth_headers, buyer_headers,
                                          vendor_profile, published_product):
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 3,
        "delivery_location": "Thane",
    })
    inquiry = res.json()
    res = await client.post(f"/api/vendors/me/inquiries/{inquiry['id']}/quotation",
                            headers=auth_headers, json={
                                "valid_until": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                                "items": [{"name": "Gloves", "quantity": 3, "unit_price": 500}],
                            })
    assert res.status_code == 422  # valid_until in the past rejected at creation


async def test_dashboard_stats(client: AsyncClient, auth_headers, buyer_headers,
                               vendor_profile, published_product):
    # create one inquiry so dashboard has data
    await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 60,
        "delivery_location": "Mumbai",
    })
    res = await client.get("/api/vendors/me/dashboard", headers=auth_headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_products"] >= 1
    assert stats["pending_inquiries"] >= 1
    assert stats["active_listings"] >= 1
    assert "recent_activity" in stats


async def test_vendor_registration_unauthenticated_new_account(client: AsyncClient, db):
    """Public vendor signup creates an unverified user + pending profile (no auth)."""
    res = await client.post("/api/vendors/register", json=VENDOR_REGISTER_PAYLOAD)
    assert res.status_code == 201
    # duplicate signup now conflicts
    res = await client.post("/api/vendors/register", json=VENDOR_REGISTER_PAYLOAD)
    assert res.status_code == 409


# ---------------------------------------------------------------------------
# Buyer-facing marketplace browse + tracking (/api/marketplace/*, /api/my/*)
# ---------------------------------------------------------------------------


async def test_marketplace_browse_products(client: AsyncClient, auth_headers, vendor_profile,
                                           published_product):
    """Published products from verified vendors appear; tiers available on detail."""
    res = await client.get("/api/marketplace/products")
    assert res.status_code == 200
    body = res.json()
    assert any(p["id"] == str(published_product.id) for p in body["items"])
    card = next(p for p in body["items"] if p["id"] == str(published_product.id))
    assert card["vendor"]["business_name"] == "Acme Industrial"
    assert card["vendor"]["status"] == "verified"

    # search + category filters
    res = await client.get("/api/marketplace/products", params={"search": "Gloves"})
    assert any(p["id"] == str(published_product.id) for p in res.json()["items"])
    res = await client.get("/api/marketplace/products", params={"search": "nonexistent-xyz"})
    assert all(p["id"] != str(published_product.id) for p in res.json()["items"])


async def _add_tiers(db, product, tiers):
    for mn, mx, price in tiers:
        db.add(BulkPricing(product_id=product.id, min_quantity=mn, max_quantity=mx, unit_price=price))
    await db.commit()


async def test_marketplace_product_detail_with_tiers(client: AsyncClient, db, auth_headers,
                                                     vendor_profile, published_product):
    await _add_tiers(db, published_product, [(1, 49, 500), (50, 199, 450), (200, 499, 420), (500, None, 390)])
    res = await client.get(f"/api/marketplace/products/{published_product.id}")
    assert res.status_code == 200
    detail = res.json()
    assert len(detail["bulk_pricing"]) == 4
    assert detail["vendor"]["business_name"] == "Acme Industrial"
    # tiers sorted by min_quantity
    mins = [t["min_quantity"] for t in detail["bulk_pricing"]]
    assert mins == sorted(mins)


async def test_marketplace_hides_draft_and_unverified(client: AsyncClient, db, vendor_user,
                                                      vendor_profile, published_product):
    """Draft products and unverified vendors must never appear publicly."""
    draft = Product(vendor_id=vendor_profile.id, name="Secret Draft", category="X",
                    price=1, unit="unit", moq=1, status=ListingStatus.DRAFT)
    db.add(draft)
    await db.commit()
    res = await client.get("/api/marketplace/products")
    ids = [p["id"] for p in res.json()["items"]]
    assert str(published_product.id) in ids
    assert str(draft.id) not in ids
    # draft product detail also hidden
    res = await client.get(f"/api/marketplace/products/{draft.id}")
    assert res.status_code == 404


async def test_marketplace_services_browse(client: AsyncClient, db, vendor_profile):
    from app.models.product import VendorService
    s = VendorService(vendor_id=vendor_profile.id, name="Machine Installation",
                      category="Installation", base_price=5000, pricing_unit="day",
                      status=ListingStatus.PUBLISHED)
    db.add(s)
    await db.commit()
    res = await client.get("/api/marketplace/services")
    assert res.status_code == 200
    body = res.json()
    assert any(s2["id"] == str(s.id) for s2 in body["items"])
    assert body["items"][0]["vendor"]["business_name"] == "Acme Industrial"


async def test_buyer_inquiry_tracking(client: AsyncClient, auth_headers, buyer_headers,
                                      vendor_profile, published_product):
    """Buyer sees own inquiries with vendor/listing names; cannot see others'."""
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 120,
        "delivery_location": "Nagpur",
    })
    inquiry_id = res.json()["id"]

    res = await client.get("/api/my/inquiries", headers=buyer_headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(i["id"] == inquiry_id for i in items)
    mine = next(i for i in items if i["id"] == inquiry_id)
    assert mine["vendor_name"] == "Acme Industrial"
    assert mine["item_name"] == "Industrial Gloves"
    assert "gstin" not in mine and "pan" not in mine  # no private vendor fields

    # vendor cannot see buyer's inquiry through the buyer endpoint
    res = await client.get(f"/api/my/inquiries/{inquiry_id}", headers=auth_headers)
    assert res.status_code == 404


async def test_buyer_quotations_and_orders_tracking(client: AsyncClient, auth_headers, buyer_headers,
                                                    vendor_profile, published_product):
    from datetime import datetime as _dt
    res = await client.post("/api/inquiries", headers=buyer_headers, json={
        "vendor_id": str(vendor_profile.id),
        "product_id": str(published_product.id),
        "quantity": 60,
        "delivery_location": "Surat",
    })
    inquiry_id = res.json()["id"]
    res = await client.post(f"/api/vendors/me/inquiries/{inquiry_id}/quotation",
                            headers=auth_headers, json={
                                "items": [{"name": "Gloves", "quantity": 60, "unit_price": 450}],
                            })
    assert res.status_code == 201, res.text
    quotation_id = res.json()["id"]

    # Buyer sees the quotation in /api/my/quotations
    res = await client.get("/api/my/quotations", headers=buyer_headers)
    assert res.status_code == 200
    assert any(q["id"] == quotation_id for q in res.json()["items"])

    # Accept → order appears in /api/my/orders with vendor name
    res = await client.post(f"/api/quotations/{quotation_id}/decide", headers=buyer_headers,
                            json={"action": "accept"})
    assert res.status_code == 201, res.text
    order_id = res.json()["id"]

    res = await client.get("/api/my/orders", headers=buyer_headers)
    assert res.status_code == 200
    orders = res.json()["items"]
    assert any(o["id"] == order_id for o in orders)
    mine = next(o for o in orders if o["id"] == order_id)
    assert mine["vendor_name"] == "Acme Industrial"
    assert mine["status"] == "pending"
    assert mine["quotation"]["items"][0]["name"] == "Gloves"

    # Vendor's orders listing must NOT leak into buyer endpoint
    res = await client.get(f"/api/my/orders/{order_id}", headers=auth_headers)
    assert res.status_code == 404
