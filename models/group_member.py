from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id")
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    group = relationship(
        "Group",
        back_populates="members"
    )

    student = relationship(
        "User",
        back_populates="group_memberships"
    )

    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "student_id",
            name="uq_group_student"
        ),
    )
