from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    title: Mapped[str] = mapped_column(
        String(200)
    )

    description: Mapped[str] = mapped_column(
        Text
    )

    deadline: Mapped[datetime]

    max_score: Mapped[int] = mapped_column(
        default=100
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id")
    )

    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    # Задание необязательно должно относиться
    # к конкретному занятию
    lesson_id: Mapped[int | None] = mapped_column(
        ForeignKey("lessons.id"),
        nullable=True
    )

    group = relationship(
        "Group",
        back_populates="tasks"
    )

    teacher = relationship(
        "User",
        back_populates="created_tasks"
    )

    lesson = relationship(
        "Lesson",
        back_populates="tasks"
    )

    submissions = relationship(
        "Submission",
        back_populates="task",
        cascade="all, delete-orphan"
    )
