from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True
    )

    members = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan"
    )

    lessons = relationship(
        "Lesson",
        back_populates="group",
        cascade="all, delete-orphan"
    )

    tasks = relationship(
        "Task",
        back_populates="group",
        cascade="all, delete-orphan"
    )
