from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class TaskCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200
    )

    description: str = Field(
        min_length=3
    )

    deadline: datetime

    max_score: int = Field(
        default=100,
        gt=0
    )

    group_id: int = Field(
        gt=0
    )

    student_id: int | None = Field(
        default=None,
        gt=0
    )



    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: datetime):
        if value <= datetime.now():
            raise ValueError(
                "Срок выполнения должен быть в будущем"
            )

        return value


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    deadline: datetime
    max_score: int

    group_id: int
    teacher_id: int
    student_id: int | None

    model_config = ConfigDict(
        from_attributes=True
    )
