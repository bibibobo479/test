from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from schemas.task import (
    TaskResponse,
    TaskCreate
)
from sqlalchemy import select, or_

from models.task import Task
from models.group import Group
from models.group_member import GroupMember
from models.user import User
from models.lesson import Lesson

from security import (
    get_current_user,
    require_teacher,
)

router = APIRouter(
    prefix="/tasks",
    tags=["Занятия"],
)
@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    # Ищем группу
    group = db.get(
        Group,
        data.group_id
    )

    # Проверяем существование группы
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена"
        )

    # Проверяем владельца группы
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете создавать задачи для чужой группы"
        )

    # Если указан конкретный студент
    if data.student_id is not None:
        student = db.get(
            User,
            data.student_id
        )

        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Студент не найден"
            )

        if student.role != "student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь не является студентом"
            )

        # Проверяем принадлежность студента группе
        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == data.group_id,
                GroupMember.student_id == data.student_id
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Студент не состоит в этой группе"
            )

    # Создаём задачу
    task = Task(
        title=data.title,
        description=data.description,
        deadline=data.deadline,
        max_score=data.max_score,
        group_id=data.group_id,
        teacher_id=teacher.id,
        student_id=data.student_id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@router.get(
    "",
    response_model=list[TaskResponse],
)
def get_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -------------------------
    # Преподаватель
    # -------------------------

    if current_user.role == "teacher":
        tasks = db.scalars(
            select(Task)
            .where(
                Task.teacher_id == current_user.id
            )
            .order_by(
                Task.deadline
            )
        ).all()

        return tasks

    # -------------------------
    # Учащийся
    # -------------------------

    if current_user.role == "student":
        tasks = db.scalars(
            select(Task)
            .join(
                GroupMember,
                GroupMember.group_id == Task.group_id
            )
            .where(
                GroupMember.student_id == current_user.id,
                or_(
                    Task.student_id.is_(None),
                    Task.student_id == current_user.id
                )
            )
            .order_by(
                Task.deadline
            )
        ).all()

        return tasks

    return []
