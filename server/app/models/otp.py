from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
import enum

from app.db.base import Base


class OtpPurpose(str, enum.Enum):
    SIGNUP = "signup"
    RESET = "reset"


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID, ForeignKey("users.id"), nullable=False, index=True)
    purpose: Mapped[OtpPurpose] = mapped_column(SQLEnum(OtpPurpose), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship to User - back_populates will be set dynamically
    user: Mapped["User"] = relationship(backref="otp_codes")  # type: ignore

    def __repr__(self) -> str:
        return f"<OtpCode(id={self.id}, user_id={self.user_id}, purpose={self.purpose})>"
