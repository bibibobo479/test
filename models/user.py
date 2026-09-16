from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100)
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    role: Mapped[str] = mapped_column(
        String(20)
    )

    # Группы, в которых состоит студент
    group_memberships = relationship(
        "GroupMember",
        back_populates="student"
    )

    # Занятия преподавателя
    lessons = relationship(
        "Lesson",
        back_populates="teacher"
    )

    # Задания преподавателя
    created_tasks = relationship(
        "Task",
        back_populates="teacher"
    )

    # Работы студента
    submissions = relationship(
        "Submission",
        back_populates="student"
    )
