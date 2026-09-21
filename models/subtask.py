from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Subtask(Base):
    __tablename__ = "subtasks"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="todo",
    )

    is_blocked: Mapped[bool] = mapped_column(
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        default=datetime.now,
    )

    deadline: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        default="normal",
    )

    result: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    external_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id"),
    )

    student_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
    )

    task = relationship(
        "Task",
        back_populates="subtasks",
    )

    student = relationship(
        "User",
        foreign_keys=[student_id],
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
    )

    comments = relationship(
        "SubtaskComment",
        back_populates="subtask",
        cascade="all, delete-orphan",
    )
