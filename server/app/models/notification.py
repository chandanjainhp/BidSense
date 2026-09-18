from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
import enum

from app.db.base import Base


class NotificationType(str, enum.Enum):
    AI = "ai"
    RFP = "rfp"
    VENDOR = "vendor"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        "type",
        SQLEnum(NotificationType, name="notification_type", create_type=True),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    related_rfp_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID, ForeignKey("rfps.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="notifications")
    related_rfp = relationship("Rfp", backref="notifications")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.notification_type})>"


# Add to User model
from app.models.user import User
User.notifications = relationship(
    "Notification", order_by=Notification.created_at.desc(), back_populates="user"
)
