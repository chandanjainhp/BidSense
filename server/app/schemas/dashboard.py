from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class DashboardStat(BaseModel):
    label: str
    value: int | str
    icon: str | None = None
    color: str | None = None
    bg: str | None = None
    link: str | None = None


class DashboardStatsResponse(BaseModel):
    stats: list[DashboardStat]


class ActivityItem(BaseModel):
    id: UUID
    actor_name: str
    action: str
    target: str
    time: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardActivityResponse(BaseModel):
    activities: list[ActivityItem]
