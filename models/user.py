from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))

    groups = relationship(
        "Group",
        back_populates="teacher"
    )

    group_memberships = relationship(
        "GroupMember",
        back_populates="student"
    )

    lessons = relationship(
        "Lesson",
        back_populates="teacher"
    )

    created_tasks = relationship(
        "Task",
        back_populates="teacher",
        foreign_keys="Task.teacher_id"
    )

    submissions = relationship(
        "Submission",
        back_populates="student"
    )
