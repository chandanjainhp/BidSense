from fastapi import APIRouter

from app.api.v1 import auth, vendors, rfps, proposals, chat, notifications, dashboard, settings, users, invitations

api_router = APIRouter(prefix="/api")

# Mount all v1 routers
api_router.include_router(auth.router)  # /api/auth/*
api_router.include_router(vendors.router)  # /api/vendors/*
api_router.include_router(rfps.router)  # /api/rfps/*
api_router.include_router(proposals.router)  # /api/proposals/*
api_router.include_router(chat.router)  # /api/chat/*
api_router.include_router(notifications.router)  # /api/notifications/*
api_router.include_router(dashboard.router)  # /api/dashboard/*
api_router.include_router(settings.router)  # /api/settings/*
api_router.include_router(users.router)  # /api/users/*
api_router.include_router(invitations.router)  # /api/invitations/* (public)
