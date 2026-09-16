from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id")
    )

    score: Mapped[int]

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    submission = relationship(
        "Submission",
        back_populates="grade"
    )

    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            name="uq_submission_grade"
        ),
    )
