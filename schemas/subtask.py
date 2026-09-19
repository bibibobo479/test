from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SubtaskCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200
    )

    description: str | None = None

    # True -> сразу взять себе
    # False -> оставить свободной
    take_for_myself: bool = False


class SubtaskResponse(BaseModel):
    id: int
    title: str
    description: str | None

    status: str
    is_blocked: bool

    task_id: int
    student_id: int | None
    created_by_id: int

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class SubtaskStatusUpdate(BaseModel):
    status: str


class SubtaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200
    )

    description: str | None = None
