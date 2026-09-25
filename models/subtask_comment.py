from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class SubtaskComment(Base):
    __tablename__ = "subtask_comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    text: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id"))

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    subtask = relationship("Subtask", back_populates="comments")

    author = relationship("User")
