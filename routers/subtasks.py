from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from schemas.subtask import SubtaskCreate, SubtaskResponse

from models.task import Task
from models.group_member import GroupMember
from models.user import User
from models.subtask import Subtask

from security import get_current_user

router = APIRouter(
    prefix="/subtasks",
    tags=["Задачи"],
)
@router.post(
    "/task/{task_id}",
    response_model=SubtaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_subtask(
    task_id: int,
    data: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Ищем основную задачу
    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена"
        )

    # 2. Подзадачи создают только студенты
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Подзадачи создают студенты"
        )

    # 3. Проверяем, что студент состоит в группе задачи
    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == task.group_id,
            GroupMember.student_id == current_user.id
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи"
        )

    # 4. Если задача индивидуальная,
    # она должна принадлежать текущему студенту
    if (
        task.student_id is not None
        and task.student_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эта задача назначена другому студенту"
        )

    # 5. Определяем исполнителя подзадачи
    if task.student_id is not None:
        # Индивидуальная Task:
        # подзадача всегда принадлежит этому студенту
        subtask_student_id = current_user.id
    else:
        # Групповая Task:
        # либо берём себе, либо оставляем свободной
        subtask_student_id = (
            current_user.id
            if data.take_for_myself
            else None
        )

    # 6. Создаём подзадачу
    subtask = Subtask(
        title=data.title,
        description=data.description,
        task_id=task.id,
        student_id=subtask_student_id,
        created_by_id=current_user.id
    )

    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return subtask



@router.get(
    "/task/{task_id}",
    response_model=list[SubtaskResponse],
)
def get_subtasks(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Ищем основную задачу
    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена"
        )

    # ==========================================
    # ПРЕПОДАВАТЕЛЬ
    # ==========================================

    if current_user.role == "teacher":

        # Преподаватель может смотреть только свои задачи
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя"
            )

        subtasks = db.scalars(
            select(Subtask)
            .where(
                Subtask.task_id == task.id
            )
            .order_by(
                Subtask.created_at
            )
        ).all()

        return subtasks

    # ==========================================
    # СТУДЕНТ
    # ==========================================

    if current_user.role == "student":

        # Проверяем, состоит ли студент
        # в группе основной задачи
        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == task.group_id,
                GroupMember.student_id == current_user.id
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи"
            )

        # Если задача индивидуальная,
        # она должна быть назначена этому студенту
        if (
            task.student_id is not None
            and task.student_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту"
            )

        # Доступ разрешён.
        # Получаем все подзадачи основной задачи.
        subtasks = db.scalars(
            select(Subtask)
            .where(
                Subtask.task_id == task.id
            )
            .order_by(
                Subtask.created_at
            )
        ).all()

        return subtasks

    return []
