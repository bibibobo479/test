from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SubtaskCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str | None = None

    deadline: datetime | None = None

    priority: Literal[
        "low",
        "normal",
        "high",
    ] = "normal"

    take_for_myself: bool = False


class SubtaskResponse(BaseModel):
    id: int
    title: str
    description: str | None

    status: str
    is_blocked: bool

    deadline: datetime | None
    priority: str

    result: str | None
    external_url: str | None

    task_id: int
    student_id: int | None
    created_by_id: int

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class SubtaskStatusUpdate(BaseModel):
    status: Literal[
        "todo",
        "in_progress",
        "review",
        "done",
    ]

    result: str | None = None

    external_url: str | None = Field(
        default=None,
        max_length=500,
    )

class SubtaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    description: str | None = None

    deadline: datetime | None = None

    priority: Literal[
        "low",
        "normal",
        "high",
    ] | None = None
