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

    status: Mapped[str] = mapped_column(
        String(30),
        default="todo"
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id")
    )

    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    # NULL -> задача всей группе
    # ID -> задача конкретному студенту
    student_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )
    stage_id: Mapped[int | None] = mapped_column(
        ForeignKey("stages.id"),
        nullable=True,
    )

    stage = relationship(
        "Stage",
        back_populates="tasks",
    )
    group = relationship(
        "Group",
        back_populates="tasks"
    )

    teacher = relationship(
        "User",
        back_populates="created_tasks",
        foreign_keys=[teacher_id]
    )

    student = relationship(
        "User",
        foreign_keys=[student_id]
    )

    subtasks = relationship(
        "Subtask",
        back_populates="task",
        cascade="all, delete-orphan"
    )

    submissions = relationship(
        "Submission",
        back_populates="task",
        cascade="all, delete-orphan"
    )
