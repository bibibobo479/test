from datetime import date, time

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    title: Mapped[str] = mapped_column(
        String(200)
    )

    lesson_date: Mapped[date]

    start_time: Mapped[time]

    end_time: Mapped[time]

    classroom: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    meeting_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id")
    )

    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    group = relationship(
        "Group",
        back_populates="lessons"
    )

    teacher = relationship(
        "User",
        back_populates="lessons"
    )

    tasks = relationship(
        "Task",
        back_populates="lesson"
    )
