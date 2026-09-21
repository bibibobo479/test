from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StageCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    expected_result: str | None = None


class StageResponse(BaseModel):
    id: int
    title: str
    description: str | None

    start_date: datetime | None
    deadline: datetime | None

    status: str
    expected_result: str | None

    group_id: int

    model_config = ConfigDict(
        from_attributes=True,
    )


class StageUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    description: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    expected_result: str | None = None


class StageStatusUpdate(BaseModel):
    status: Literal[
        "planned",
        "active",
        "completed",
    ]
