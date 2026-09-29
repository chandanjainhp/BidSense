from fastapi import APIRouter

from app.api.v1 import auth, vendors, rfps, proposals, chat, notifications, dashboard, settings, users, invitations, documents
from app.api.v1 import vendor_routes, products, services, bulk_sales, inquiries, quotations, orders
from app.api.v1 import marketplace, buyer

api_router = APIRouter(prefix="/api")

# Mount all v1 routers
api_router.include_router(auth.router)  # /api/auth/*
# Marketplace vendor routes FIRST so /vendors/me, /vendors/register, /vendors/store*
# are matched before the RFP-context catch-all /vendors/{vendor_id}.
api_router.include_router(vendor_routes.router)  # /api/vendors/* (marketplace profile, store)
api_router.include_router(products.router)  # /api/vendors/me/products
api_router.include_router(services.router)  # /api/vendors/me/services
api_router.include_router(bulk_sales.router)  # /api/vendors/me/bulk-sales
api_router.include_router(inquiries.buyer_router)  # /api/inquiries (buyer)
api_router.include_router(inquiries.router)  # /api/vendors/me/inquiries
api_router.include_router(quotations.router)  # /api/vendors/me/quotations
api_router.include_router(quotations.buyer_router)  # /api/quotations (buyer)
api_router.include_router(orders.router)  # /api/vendors/me/orders
api_router.include_router(marketplace.router)  # /api/marketplace/* (public browse)
api_router.include_router(buyer.router)  # /api/my/* (buyer tracking)
api_router.include_router(vendors.router)  # /api/vendors/* (RFP-context vendor CRM)
api_router.include_router(rfps.router)  # /api/rfps/*
api_router.include_router(proposals.router)  # /api/proposals/*
api_router.include_router(chat.router)  # /api/chat/*
api_router.include_router(notifications.router)  # /api/notifications/*
api_router.include_router(dashboard.router)  # /api/dashboard/*
api_router.include_router(settings.router)  # /api/settings/*
api_router.include_router(users.router)  # /api/users/*
api_router.include_router(invitations.router)  # /api/invitations/* (public)
api_router.include_router(documents.router)  # /api/documents/* (RAG knowledge base)
