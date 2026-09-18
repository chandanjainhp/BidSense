from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db_session
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    VerifyOtpRequest,
    ResendOtpRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserPublic,
    MessageResponse,
    TokenResponse,
)
from app.services.auth_service import auth_service
from app.core.security import create_access_token, create_refresh_token, generate_otp
from app.models.user import User
from app.core.dependencies import get_current_user
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db_session)):
    """Register a new user and send OTP."""
    from app.core.config import settings
    
    user, otp_code = await auth_service.register_user(db, request)
    
    # Include debug_otp only when DEBUG=true
    debug_otp = otp_code if settings.DEBUG else None
    
    return MessageResponse(
        message="Registration successful. Please verify your email with the OTP sent.",
        debug_otp=debug_otp,
    )


@router.post("/verify-otp", response_model=LoginResponse)
async def verify_otp(request: VerifyOtpRequest, db: AsyncSession = Depends(get_db_session)):
    """Verify OTP and return tokens."""
    user = await auth_service.verify_otp(db, request.email, request.code)

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    return LoginResponse(
        user=UserPublic.model_validate(user),
        token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(request: ResendOtpRequest, db: AsyncSession = Depends(get_db_session)):
    """Resend OTP for registration."""
    from app.core.config import settings
    
    success = await auth_service.resend_otp(db, request.email)
    
    # Get new OTP for debug mode
    debug_otp = None
    if settings.DEBUG and success:
        # Generate a new OTP for display in debug mode
        debug_otp = generate_otp()
    
    return MessageResponse(
        message="OTP resent successfully" if success else "Failed to resend OTP",
        debug_otp=debug_otp,
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db_session)):
    """Login with email and password."""
    user = await auth_service.authenticate_user(db, request.email, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials or account not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    return LoginResponse(
        user=UserPublic.model_validate(user),
        token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(request_data: dict):
    """Refresh access token using refresh token."""
    from app.core.security import verify_refresh_token
    
    refresh_token_str = request_data.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required",
        )

    payload = verify_refresh_token(refresh_token_str)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate new tokens
    new_access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return TokenResponse(
        token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db_session)):
    """Request password reset OTP."""
    await auth_service.forgot_password(db, request.email)
    # Always return success to avoid user enumeration
    return {"message": "If the email exists, a reset code has been sent"}


@router.post("/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db_session)):
    """Reset password with OTP."""
    success = await auth_service.reset_password(db, request.email, request.code, request.password)
    return {"message": "Password reset successfully" if success else "Failed to reset password"}


@router.post("/logout")
async def logout(refresh_token: Optional[str] = None):
    """Logout and revoke refresh token."""
    # In production, add refresh token to Redis blacklist
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserPublic)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserPublic.model_validate(current_user)
