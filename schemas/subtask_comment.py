from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SubtaskCommentCreate(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=2000
    )


class SubtaskCommentResponse(BaseModel):
    id: int
    text: str

    subtask_id: int
    author_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
