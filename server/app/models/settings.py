from sqlalchemy import Boolean, ForeignKey, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
import enum

from app.db.base import Base


class DigestFrequency(str, enum.Enum):
    INSTANT = "instant"
    DAILY = "daily"
    WEEKLY = "weekly"


class AiTone(str, enum.Enum):
    FORMAL = "formal"
    BALANCED = "balanced"
    CONCISE = "concise"


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    digest_frequency: Mapped[DigestFrequency] = mapped_column(
        SQLEnum(DigestFrequency, name="digest_frequency", create_type=True),
        default=DigestFrequency.INSTANT,
        nullable=False,
    )
    ai_tone: Mapped[AiTone] = mapped_column(
        SQLEnum(AiTone, name="ai_tone", create_type=True),
        default=AiTone.BALANCED,
        nullable=False,
    )
    ai_auto_score: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ai_suggestions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="settings", uselist=False)

    def __repr__(self) -> str:
        return f"<UserSettings(user_id={self.user_id})>"


# Add to User model
from app.models.user import User
User.settings = relationship(
    "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
)
