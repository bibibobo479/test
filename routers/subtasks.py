from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from models.group_member import GroupMember
from models.subtask import Subtask
from models.subtask_comment import SubtaskComment
from models.task import Task
from models.taskhistory import TaskHistory
from models.user import User

from schemas.subtask import (
    SubtaskCreate,
    SubtaskResponse,
    SubtaskStatusUpdate,
)
from schemas.subtask_comment import (
    SubtaskCommentCreate,
    SubtaskCommentResponse,
)
from schemas.task_history import TaskHistoryResponse

from security import get_current_user

router = APIRouter(
    prefix="/subtasks",
    tags=["Подзадачи"],
)


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================


def add_history(
    db: Session,
    subtask_id: int,
    user_id: int,
    action: str,
    old_value: str | None = None,
    new_value: str | None = None,
) -> TaskHistory:
    """
    Добавить запись в историю подзадачи.

    commit здесь специально не вызывается.
    История сохраняется вместе с основным изменением.
    """

    history = TaskHistory(
        subtask_id=subtask_id,
        user_id=user_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )

    db.add(history)

    return history


def get_membership(
    db: Session,
    group_id: int,
    student_id: int,
) -> GroupMember | None:
    """
    Получить участие студента в конкретной группе/проекте.

    Если студент не состоит в группе, возвращает None.
    """

    return db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.student_id == student_id,
        )
    )


def check_subtask_manager_access(
    db: Session,
    task: Task,
    current_user: User,
) -> None:
    """
    Проверить право пользователя управлять подзадачей.

    Управлять подзадачами могут:
    1. преподаватель, создавший основную задачу;
    2. главный студент конкретной группы/проекта.
    """

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя",
            )

        return

    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления подзадачей",
        )

    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи",
        )

    if not membership.is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=("Управлять подзадачами может " "только главный студент проекта"),
        )


# ============================================================
# СОЗДАНИЕ ПОДЗАДАЧИ
# ============================================================


@router.post(
    "/task/{task_id}",
    response_model=SubtaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subtask(
    task_id: int,
    data: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать подзадачу внутри основной задачи."""

    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Подзадачи создают студенты",
        )

    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи",
        )

    if task.student_id is not None and task.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эта задача назначена другому студенту",
        )

    if task.student_id is not None:
        subtask_student_id = current_user.id
    else:
        subtask_student_id = current_user.id if data.take_for_myself else None

    subtask = Subtask(
        title=data.title,
        description=data.description,
        deadline=data.deadline,
        priority=data.priority,
        task_id=task.id,
        student_id=subtask_student_id,
        created_by_id=current_user.id,
    )

    db.add(subtask)

    # Получаем ID подзадачи, не завершая транзакцию.
    db.flush()

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="created",
        old_value=None,
        new_value="todo",
    )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# ПОЛУЧЕНИЕ ИСТОРИИ ПОДЗАДАЧИ
# ============================================================


@router.get(
    "/{subtask_id}/history",
    response_model=list[TaskHistoryResponse],
)
def get_subtask_history(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить историю изменений подзадачи."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к истории этой подзадачи",
            )

    elif current_user.role == "student":
        membership = get_membership(
            db=db,
            group_id=task.group_id,
            student_id=current_user.id,
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи",
            )

        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к истории подзадачи",
        )

    history = db.scalars(
        select(TaskHistory)
        .where(TaskHistory.subtask_id == subtask.id)
        .order_by(TaskHistory.created_at, TaskHistory.id)
    ).all()

    return history


# ============================================================
# ПОЛУЧЕНИЕ ОДНОЙ ПОДЗАДАЧИ
# ============================================================


@router.get(
    "/{subtask_id}",
    response_model=SubtaskResponse,
)
def get_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить одну подзадачу по её ID."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя",
            )

        return subtask

    if current_user.role == "student":
        membership = get_membership(
            db=db,
            group_id=task.group_id,
            student_id=current_user.id,
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи",
            )

        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

        return subtask

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к подзадаче",
    )


# ============================================================
# ПОЛУЧЕНИЕ ВСЕХ ПОДЗАДАЧ ОСНОВНОЙ ЗАДАЧИ
# ============================================================


@router.get(
    "/task/{task_id}",
    response_model=list[SubtaskResponse],
)
def get_subtasks(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить все подзадачи основной задачи."""

    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя",
            )

    elif current_user.role == "student":
        membership = get_membership(
            db=db,
            group_id=task.group_id,
            student_id=current_user.id,
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи",
            )

        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к подзадачам",
        )

    subtasks = db.scalars(
        select(Subtask).where(Subtask.task_id == task.id).order_by(Subtask.created_at)
    ).all()

    return subtasks


# ============================================================
# ВЗЯТИЕ СВОБОДНОЙ ПОДЗАДАЧИ
# ============================================================


@router.patch(
    "/{subtask_id}/take",
    response_model=SubtaskResponse,
)
def take_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Взять свободную подзадачу групповой задачи."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только студент может взять подзадачу",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи",
        )

    if task.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=("У индивидуальной задачи подзадачи " "уже назначены студенту"),
        )

    if subtask.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Эту подзадачу уже взял другой студент",
        )
    if subtask.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Заблокированную подзадачу нельзя взять в работу",
        )

    subtask.student_id = current_user.id

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="taken",
        old_value=None,
        new_value=str(current_user.id),
    )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# ОСВОБОЖДЕНИЕ ПОДЗАДАЧИ
# ============================================================


@router.patch(
    "/{subtask_id}/release",
    response_model=SubtaskResponse,
)
def release_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Освободить свою подзадачу групповой задачи."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только студент может освободить подзадачу",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи",
        )

    if task.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Подзадачу индивидуальной задачи нельзя освободить",
        )

    if subtask.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не являетесь исполнителем этой подзадачи",
        )

    old_student_id = subtask.student_id
    old_status = subtask.status

    subtask.student_id = None
    subtask.status = "todo"

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="released",
        old_value=str(old_student_id),
        new_value=None,
    )

    # Если release заодно реально изменил статус,
    # сохраняем это отдельным событием.
    if old_status != "todo":
        add_history(
            db=db,
            subtask_id=subtask.id,
            user_id=current_user.id,
            action="status_changed",
            old_value=old_status,
            new_value="todo",
        )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# ИЗМЕНЕНИЕ СТАТУСА ПОДЗАДАЧИ
# ============================================================


@router.patch(
    "/{subtask_id}/status",
    response_model=SubtaskResponse,
)
def update_subtask_status(
    subtask_id: int,
    data: SubtaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Изменить статус подзадачи."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = subtask.task

    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять статус подзадачи может только студент",
        )

    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не состоите в группе этой задачи",
        )

    if subtask.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Подзадача заблокирована",
        )

    # --------------------------------------------------------
    # review -> done
    # --------------------------------------------------------

    if data.status == "done":
        if not membership.is_leader:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Перевести подзадачу в done может " "только главный студент проекта"
                ),
            )

        if subtask.status != "review":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Принять можно только подзадачу " "со статусом review"),
            )

        old_status = subtask.status
        subtask.status = "done"

        add_history(
            db=db,
            subtask_id=subtask.id,
            user_id=current_user.id,
            action="accepted",
            old_value=old_status,
            new_value="done",
        )

        db.commit()
        db.refresh(subtask)

        return subtask

    # --------------------------------------------------------
    # Переходы обычного исполнителя
    # --------------------------------------------------------

    if subtask.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=("Изменять статус может только " "исполнитель подзадачи"),
        )

    allowed_transitions = {
        "todo": "in_progress",
        "in_progress": "review",
    }

    expected_status = allowed_transitions.get(subtask.status)

    if expected_status != data.status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Недопустимый переход статуса: " f"{subtask.status} -> {data.status}"
            ),
        )

    if data.status == "review":
        if not data.result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "При отправке на проверку " "необходимо указать результат работы"
                ),
            )

        subtask.result = data.result
        subtask.external_url = data.external_url

    old_status = subtask.status
    subtask.status = data.status

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="status_changed",
        old_value=old_status,
        new_value=subtask.status,
    )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# БЛОКИРОВКА ПОДЗАДАЧИ
# ============================================================


@router.patch(
    "/{subtask_id}/block",
    response_model=SubtaskResponse,
)
def block_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Заблокировать подзадачу."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    check_subtask_manager_access(
        db=db,
        task=task,
        current_user=current_user,
    )

    if subtask.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Подзадача уже заблокирована",
        )

    subtask.is_blocked = True

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="blocked",
        old_value="false",
        new_value="true",
    )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# РАЗБЛОКИРОВКА ПОДЗАДАЧИ
# ============================================================


@router.patch(
    "/{subtask_id}/unblock",
    response_model=SubtaskResponse,
)
def unblock_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Разблокировать подзадачу."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    check_subtask_manager_access(
        db=db,
        task=task,
        current_user=current_user,
    )

    if not subtask.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Подзадача уже разблокирована",
        )

    subtask.is_blocked = False

    add_history(
        db=db,
        subtask_id=subtask.id,
        user_id=current_user.id,
        action="unblocked",
        old_value="true",
        new_value="false",
    )

    db.commit()
    db.refresh(subtask)

    return subtask


# ============================================================
# СОЗДАНИЕ КОММЕНТАРИЯ
# ============================================================


@router.post(
    "/{subtask_id}/comments",
    response_model=SubtaskCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subtask_comment(
    subtask_id: int,
    data: SubtaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Добавить комментарий к подзадаче."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("Вы не можете комментировать " "подзадачи чужой задачи"),
            )

    elif current_user.role == "student":
        membership = get_membership(
            db=db,
            group_id=task.group_id,
            student_id=current_user.id,
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи",
            )

        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к комментариям",
        )

    subtask_comment = SubtaskComment(
        text=data.text,
        subtask_id=subtask.id,
        author_id=current_user.id,
    )

    db.add(subtask_comment)
    db.commit()
    db.refresh(subtask_comment)

    return subtask_comment


# ============================================================
# ПОЛУЧЕНИЕ КОММЕНТАРИЕВ
# ============================================================


@router.get(
    "/{subtask_id}/comments",
    response_model=list[SubtaskCommentResponse],
)
def get_subtask_comments(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить комментарии подзадачи."""

    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("Вы не можете читать " "комментарии чужой задачи"),
            )

    elif current_user.role == "student":
        membership = get_membership(
            db=db,
            group_id=task.group_id,
            student_id=current_user.id,
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в группе этой задачи",
            )

        if task.student_id is not None and task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к комментариям",
        )

    comments = db.scalars(
        select(SubtaskComment)
        .where(SubtaskComment.subtask_id == subtask.id)
        .order_by(SubtaskComment.created_at)
    ).all()

    return comments
