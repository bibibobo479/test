from datetime import date, time

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    model_validator,
    field_validator,
)


class LessonCreate(BaseModel):
    title: str = Field(
        min_length=5,
        max_length=100
    )

    group_id: int = Field(
        gt=0
    )

    lesson_date: date

    start_time: time

    end_time: time

    classroom: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    meeting_url: HttpUrl | None = None

    # ------------------------------------------
    # Дата занятия не может быть в прошлом
    # ------------------------------------------

    @field_validator("lesson_date")
    @classmethod
    def validate_lesson_date(cls, value: date):
        if value < date.today():
            raise ValueError(
                "Дата занятия не может быть в прошлом"
            )

        return value

    # ------------------------------------------
    # Проверяем время начала
    # 09:20 - 20:00
    # ------------------------------------------

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, value: time):
        min_time = time(9, 20)
        max_time = time(20, 0)

        if not min_time <= value <= max_time:
            raise ValueError(
                "Занятие должно начинаться "
                "с 09:20 до 20:00"
            )

        return value

    # ------------------------------------------
    # Проверяем время окончания
    # 09:20 - 21:00
    # ------------------------------------------

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, value: time):
        min_time = time(9, 20)
        max_time = time(21, 0)

        if not min_time <= value <= max_time:
            raise ValueError(
                "Занятие должно заканчиваться "
                "с 09:20 до 21:00"
            )

        return value

    # ------------------------------------------
    # Конец должен быть позже начала
    # ------------------------------------------

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.end_time <= self.start_time:
            raise ValueError(
                "Время окончания должно быть "
                "позже времени начала"
            )

        return self


class LessonResponse(BaseModel):
    id: int
    title: str

    lesson_date: date
    start_time: time
    end_time: time

    classroom: str | None
    meeting_url: str | None

    group_id: int
    teacher_id: int

    model_config = ConfigDict(
        from_attributes=True
    )
