from datetime import datetime, timezone, timedelta
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings
from app.core.security import get_password_hash, generate_otp, hash_otp, verify_otp
from app.models.user import User
from app.models.otp import OtpCode, OtpPurpose
from app.schemas.auth import RegisterRequest
from app.core.exceptions import ConflictError, UnprocessableError, NotFoundError


class AuthService:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

    async def get_redis(self) -> redis.Redis:
        if not self.redis_client:
            self.redis_client = redis.from_url(settings.REDIS_URL)
        return self.redis_client

    async def register_user(
        self, db_session, register_data: RegisterRequest
    ) -> tuple[User, str]:
        """Register a new user and generate OTP."""
        from sqlalchemy import select

        # Check if user already exists
        result = await db_session.execute(select(User).where(User.email == register_data.full_name if hasattr(register_data, 'full_name') else register_data.email))
        existing = result.scalar_one_or_none()
        if existing:
            raise ConflictError(
                detail="User with this email already exists",
                code="USER_EXISTS",
                fields={"email": "Email already registered"},
            )

        # Create user (unverified)
        user = User(
            full_name=register_data.full_name,
            email=register_data.email,
            hashed_password=get_password_hash(register_data.password),
            is_verified=False,
        )
        db_session.add(user)
        await db_session.flush()  # Get the ID

        # Generate OTP
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code)

        # Store OTP in database
        otp = OtpCode(
            user_id=user.id,
            purpose=OtpPurpose.SIGNUP,
            code_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            consumed=False,
        )
        db_session.add(otp)
        await db_session.flush()

        # Also store in Redis for rate limiting
        r = await self.get_redis()
        rate_limit_key = f"otp:signup:{user.email}"
        await r.setex(rate_limit_key, 600, "1")  # 10 minutes expiry

        # TODO: Send OTP email via EmailService
        print(f"OTP for {user.email}: {otp_code}")  # Remove in production

        return user, otp_code

    async def verify_otp(self, db_session, email: str, code: str) -> User:
        """Verify OTP and activate user account."""
        from sqlalchemy import select

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundError(detail="User not found", code="USER_NOT_FOUND")

        if user.is_verified:
            raise UnprocessableError(detail="User already verified", code="ALREADY_VERIFIED")

        # Find valid OTP from database
        result = await db_session.execute(
            select(OtpCode)
            .where(OtpCode.user_id == user.id)
            .where(OtpCode.purpose == OtpPurpose.SIGNUP)
            .where(OtpCode.consumed == False)
            .where(OtpCode.expires_at > datetime.now(timezone.utc))
            .order_by(OtpCode.created_at.desc())
        )
        otp_record = result.scalar_one_or_none()

        if not otp_record:
            raise UnprocessableError(detail="OTP expired or invalid", code="OTP_EXPIRED")

        if not verify_otp(code, otp_record.code_hash):
            # Track attempts
            otp_record.attempts += 1
            if otp_record.attempts >= 5:
                otp_record.consumed = True  # Lock out
                await db_session.flush()
                raise UnprocessableError(detail="Too many failed attempts", code="OTP_LOCKED")
            await db_session.flush()
            raise UnprocessableError(detail="Invalid OTP", code="OTP_INVALID")

        # Mark OTP as consumed
        otp_record.consumed = True
        await db_session.flush()

        # Mark user as verified
        user.is_verified = True
        await db_session.flush()

        return user

    async def resend_otp(self, db_session, email: str) -> bool:
        """Resend OTP with rate limiting."""
        from sqlalchemy import select

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or user.is_verified:
            return True  # Always return success to avoid enumeration

        # Check rate limit in Redis
        r = await self.get_redis()
        rate_limit_key = f"otp:resend:{email}"
        current = await r.get(rate_limit_key)

        if current:
            raise UnprocessableError(detail="Please wait before requesting another OTP", code="RATE_LIMITED")

        # Invalidate old OTPs
        result = await db_session.execute(
            select(OtpCode)
            .where(OtpCode.user_id == user.id)
            .where(OtpCode.purpose == OtpPurpose.SIGNUP)
            .where(OtpCode.consumed == False)
        )
        old_otps = result.scalars().all()
        for old_otp in old_otps:
            old_otp.consumed = True

        # Generate new OTP
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code)
        otp = OtpCode(
            user_id=user.id,
            purpose=OtpPurpose.SIGNUP,
            code_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            consumed=False,
        )
        db_session.add(otp)
        await db_session.flush()

        # Set rate limit
        await r.setex(rate_limit_key, 60, "1")  # 1 minute rate limit

        print(f"New OTP for {email}: {otp_code}")  # TODO: Send email
        return True

    async def authenticate_user(self, db_session, email: str, password: str) -> User | None:
        """Authenticate user with email and password."""
        from sqlalchemy import select

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not user.is_verified:
            return None

        import bcrypt
        try:
            if not bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8')):
                return None
        except Exception:
            return None

        return user

    async def forgot_password(self, db_session, email: str) -> bool:
        """Generate password reset OTP."""
        from sqlalchemy import select

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            return True  # Always return success to avoid enumeration

        # Generate OTP
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code)
        otp = OtpCode(
            user_id=user.id,
            purpose=OtpPurpose.RESET,
            code_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            consumed=False,
        )
        db_session.add(otp)
        await db_session.flush()

        print(f"Reset OTP for {email}: {otp_code}")  # TODO: Send email
        return True

    async def reset_password(self, db_session, email: str, code: str, new_password: str) -> bool:
        """Reset password with OTP verification."""
        from sqlalchemy import select

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundError(detail="User not found", code="USER_NOT_FOUND")

        # Find valid OTP
        result = await db_session.execute(
            select(OtpCode)
            .where(OtpCode.user_id == user.id)
            .where(OtpCode.purpose == OtpPurpose.RESET)
            .where(OtpCode.consumed == False)
            .where(OtpCode.expires_at > datetime.now(timezone.utc))
            .order_by(OtpCode.created_at.desc())
        )
        otp_record = result.scalar_one_or_none()

        if not otp_record:
            raise UnprocessableError(detail="OTP expired or invalid", code="OTP_EXPIRED")

        if not verify_otp(code, otp_record.code_hash):
            otp_record.attempts += 1
            if otp_record.attempts >= 5:
                otp_record.consumed = True
            await db_session.flush()
            raise UnprocessableError(detail="Invalid OTP", code="OTP_INVALID")

        # Update password
        user.hashed_password = get_password_hash(new_password)
        otp_record.consumed = True
        await db_session.flush()

        return True


auth_service = AuthService()
