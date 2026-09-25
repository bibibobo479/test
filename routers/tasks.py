from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import get_db

from models.group import Group
from models.group_member import GroupMember
from models.stage import Stage
from models.task import Task
from models.user import User

from schemas.task import (
    TaskCreate,
    TaskResponse,
)

from security import (
    get_current_user,
    require_teacher,
)

router = APIRouter(
    prefix="/tasks",
    tags=["Задачи"],
)


# ============================================================
# СОЗДАНИЕ ЗАДАЧИ
# ============================================================


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """
    Создать основную задачу внутри этапа проекта.

    В текущей архитектуре основная Task фактически
    выполняет роль Epic из технического задания.
    """

    # --------------------------------------------------------
    # ПРОВЕРКА ПРОЕКТА
    # --------------------------------------------------------

    # Получаем группу/проект.
    group = db.get(
        Group,
        data.group_id,
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # Преподаватель может создавать задачи
    # только внутри своего проекта.
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете создавать задачи для чужой группы",
        )

    # --------------------------------------------------------
    # ПРОВЕРКА ЭТАПА
    # --------------------------------------------------------

    # Получаем выбранный этап.
    stage = db.get(
        Stage,
        data.stage_id,
    )

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Этап не найден",
        )

    # Этап обязательно должен принадлежать
    # тому же проекту, для которого создаётся задача.
    if stage.group_id != group.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этап не принадлежит указанной группе",
        )

    # --------------------------------------------------------
    # ПРОВЕРКА СТУДЕНТА
    # --------------------------------------------------------

    # Если задача назначается конкретному студенту,
    # проверяем существование пользователя и его участие
    # в данном проекте.
    if data.student_id is not None:
        student = db.get(
            User,
            data.student_id,
        )

        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Студент не найден",
            )

        if student.role != "student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь не является студентом",
            )

        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.student_id == student.id,
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Студент не состоит в этой группе",
            )

    # --------------------------------------------------------
    # СОЗДАНИЕ ЗАДАЧИ
    # --------------------------------------------------------

    task = Task(
        title=data.title,
        description=data.description,
        deadline=data.deadline,
        max_score=data.max_score,
        group_id=group.id,
        stage_id=stage.id,
        teacher_id=teacher.id,
        student_id=data.student_id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# ============================================================
# ПОЛУЧЕНИЕ ДОСТУПНЫХ ЗАДАЧ
# ============================================================


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить одну основную задачу (Epic) по ID.

    Пользователь получает Epic только в том случае,
    если имеет доступ к соответствующему проекту.
    """

    task = db.get(
        Task,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    # --------------------------------------------------------
    # ПРЕПОДАВАТЕЛЬ
    # --------------------------------------------------------

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой задаче",
            )

        return task

    # --------------------------------------------------------
    # СТУДЕНТ
    # --------------------------------------------------------

    if current_user.role == "student":
        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == task.group_id,
                GroupMember.student_id == current_user.id,
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой задаче",
            )

        # Если Epic назначен конкретному студенту,
        # другие студенты его не получают.
        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой задаче",
            )

        return task

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к этой задаче",
    )


@router.get(
    "",
    response_model=list[TaskResponse],
)
def get_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список доступных пользователю основных задач.

    Преподаватель получает созданные им задачи.
    Студент получает групповые задачи и индивидуальные
    задачи, назначенные непосредственно ему.
    """

    # --------------------------------------------------------
    # ПРЕПОДАВАТЕЛЬ
    # --------------------------------------------------------

    if current_user.role == "teacher":
        tasks = db.scalars(
            select(Task)
            .where(
                Task.teacher_id == current_user.id,
            )
            .order_by(
                Task.deadline,
            )
        ).all()

        return tasks

    # --------------------------------------------------------
    # СТУДЕНТ
    # --------------------------------------------------------

    if current_user.role == "student":
        tasks = db.scalars(
            select(Task)
            .join(
                GroupMember,
                GroupMember.group_id == Task.group_id,
            )
            .where(
                GroupMember.student_id == current_user.id,
                or_(
                    Task.student_id.is_(None),
                    Task.student_id == current_user.id,
                ),
            )
            .order_by(
                Task.deadline,
            )
        ).all()

        return tasks

    return []
