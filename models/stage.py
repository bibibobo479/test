from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Stage(Base):
    __tablename__ = "stages"

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

    start_date: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )

    deadline: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="planned",
    )

    expected_result: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id"),
    )

    group = relationship(
        "Group",
        back_populates="stages",
    )

    tasks = relationship(
        "Task",
        back_populates="stage",
    )
