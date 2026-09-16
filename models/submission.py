from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id")
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    github_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    game_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="submitted"
    )

    submitted_at: Mapped[datetime] = mapped_column(
        default=datetime.now
    )

    task = relationship(
        "Task",
        back_populates="submissions"
    )

    student = relationship(
        "User",
        back_populates="submissions"
    )

    grade = relationship(
        "Grade",
        back_populates="submission",
        uselist=False,
        cascade="all, delete-orphan"
    )
