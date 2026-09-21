from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class TaskHistory(Base):
    __tablename__ = "task_history"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    subtask_id: Mapped[int] = mapped_column(
        ForeignKey("subtasks.id"),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    old_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    new_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        default=datetime.now,
    )

    subtask = relationship(
        "Subtask",
        back_populates="history",
    )

    user = relationship(
        "User",
    )
