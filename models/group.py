from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    # Название группы
    # Например: GD-101
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True
    )

    # Код для самостоятельного вступления студентов
    # Например: K7P2XA
    invite_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False
    )

    # Преподаватель, которому принадлежит группа
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    # -------------------------
    # Relationships
    # -------------------------

    teacher = relationship(
        "User",
        back_populates="groups"
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
    stages = relationship(
        "Stage",
        back_populates="group",
        cascade="all, delete-orphan",
    )
