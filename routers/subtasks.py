from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from models.group_member import GroupMember
from models.subtask import Subtask
from models.subtask_comment import SubtaskComment
from models.task import Task
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

from security import get_current_user


router = APIRouter(
    prefix="/subtasks",
    tags=["Подзадачи"],
)


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================


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

    # Преподаватель может управлять только своими задачами.
    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя",
            )

        return

    # Все остальные управляющие действия доступны
    # только студентам.
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

    # Проверяем, является ли студент главным
    # именно в этом проекте.
    if not membership.is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Управлять подзадачами может только главный студент проекта",
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

    # Получаем основную задачу.
    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    # Создавать подзадачи могут студенты.
    # Главный студент тоже имеет role="student",
    # поэтому отдельная роль ему не требуется.
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Подзадачи создают студенты",
        )

    # Проверяем, что студент состоит в группе задачи.
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

    # Если основная задача индивидуальная,
    # она должна принадлежать текущему студенту.
    if (
        task.student_id is not None
        and task.student_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эта задача назначена другому студенту",
        )

    # Для индивидуальной задачи подзадача автоматически
    # назначается студенту.
    #
    # Для групповой задачи студент может либо взять
    # подзадачу себе, либо оставить её свободной.
    if task.student_id is not None:
        subtask_student_id = current_user.id
    else:
        subtask_student_id = (
            current_user.id
            if data.take_for_myself
            else None
        )

    # Создаём подзадачу.
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
    db.commit()
    db.refresh(subtask)

    return subtask


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

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Преподаватель видит подзадачи только своих задач.
    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это задача другого преподавателя",
            )

        return subtask

    # Проверяем доступ студента.
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

        # Индивидуальная основная задача доступна
        # только назначенному студенту.
        if (
            task.student_id is not None
            and task.student_id != current_user.id
        ):
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

    # Получаем основную задачу.
    task = db.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    # Преподаватель видит подзадачи только своих задач.
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

        # Если основная задача индивидуальная,
        # она доступна только назначенному студенту.
        if (
            task.student_id is not None
            and task.student_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к подзадачам",
        )

    # После проверки прав получаем все подзадачи.
    subtasks = db.scalars(
        select(Subtask)
        .where(Subtask.task_id == task.id)
        .order_by(Subtask.created_at)
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

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Брать подзадачи могут только студенты.
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только студент может взять подзадачу",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Проверяем членство студента в группе.
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

    # Свободные подзадачи можно брать только
    # у групповой основной задачи.
    if task.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "У индивидуальной задачи подзадачи "
                "уже назначены студенту"
            ),
        )

    # Проверяем, что подзадача действительно свободна.
    if subtask.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Эту подзадачу уже взял другой студент",
        )

    # Назначаем текущего студента исполнителем.
    subtask.student_id = current_user.id

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

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Освобождать подзадачи могут только студенты.
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только студент может освободить подзадачу",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Проверяем членство студента в группе.
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

    # Индивидуальную подзадачу освободить нельзя.
    if task.student_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Подзадачу индивидуальной задачи нельзя освободить",
        )

    # Освободить подзадачу может только её исполнитель.
    if subtask.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не являетесь исполнителем этой подзадачи",
        )

    # Делаем подзадачу свободной и возвращаем
    # её в начальный статус.
    subtask.student_id = None
    subtask.status = "todo"

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
    # 1. Ищем подзадачу
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=404,
            detail="Подзадача не найдена",
        )

    # 2. Получаем родительскую задачу
    task = subtask.task

    # 3. Статус меняют студенты
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Изменять статус подзадачи может только студент",
        )

    # 4. Проверяем, что студент состоит в проекте
    membership = get_membership(
        db=db,
        group_id=task.group_id,
        student_id=current_user.id,
    )

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Вы не состоите в группе этой задачи",
        )

    # 5. Заблокированную подзадачу менять нельзя
    if subtask.is_blocked:
        raise HTTPException(
            status_code=409,
            detail="Подзадача заблокирована",
        )

    # 6. Переход review -> done
    # разрешён только главному студенту проекта
    if data.status == "done":
        if not membership.is_leader:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Перевести подзадачу в done может "
                    "только главный студент проекта"
                ),
            )

        if subtask.status != "review":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Принять можно только подзадачу "
                    "со статусом review"
                ),
            )

        subtask.status = "done"

        db.commit()
        db.refresh(subtask)

        return subtask

    # 7. Остальные переходы может делать
    # только назначенный исполнитель
    if subtask.student_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "Изменять статус может только "
                "исполнитель подзадачи"
            ),
        )

    # 8. Разрешённые переходы обычного студента
    allowed_transitions = {
        "todo": "in_progress",
        "in_progress": "review",
    }

    expected_status = allowed_transitions.get(
        subtask.status
    )

    if expected_status != data.status:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Недопустимый переход статуса: "
                f"{subtask.status} -> {data.status}"
            ),
        )

    # 9. При отправке на review
    # обязательно нужен результат работы
    if data.status == "review":
        if not data.result:
            raise HTTPException(
                status_code=400,
                detail=(
                    "При отправке на проверку "
                    "необходимо указать результат работы"
                ),
            )

        subtask.result = data.result
        subtask.external_url = data.external_url

    # 10. Меняем статус
    subtask.status = data.status

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
    """
    Заблокировать подзадачу.

    Доступ:
    - преподаватель-владелец задачи;
    - главный студент проекта.
    """

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Проверяем расширенные права.
    check_subtask_manager_access(
        db=db,
        task=task,
        current_user=current_user,
    )

    # Блокируем подзадачу.
    subtask.is_blocked = True

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
    """
    Разблокировать подзадачу.

    Доступ:
    - преподаватель-владелец задачи;
    - главный студент проекта.
    """

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найддена",
        )

    # Проверяем расширенные права.
    check_subtask_manager_access(
        db=db,
        task=task,
        current_user=current_user,
    )

    # Разблокируем подзадачу.
    subtask.is_blocked = False

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

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Преподаватель может комментировать
    # только свои задачи.
    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Вы не можете комментировать "
                    "подзадачи чужой задачи"
                ),
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

        # Для индивидуальной основной задачи
        # доступ имеет только назначенный студент.
        if (
            task.student_id is not None
            and task.student_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к комментариям",
        )

    # Создаём комментарий.
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

    # Получаем подзадачу.
    subtask = db.get(Subtask, subtask_id)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подзадача не найдена",
        )

    # Получаем родительскую задачу.
    task = db.get(Task, subtask.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Основная задача не найдена",
        )

    # Проверяем доступ преподавателя.
    if current_user.role == "teacher":
        if task.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не можете читать комментарии чужой задачи",
            )

    # Проверяем доступ студента.
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

        # Индивидуальная основная задача доступна
        # только назначенному студенту.
        if (
            task.student_id is not None
            and task.student_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта задача назначена другому студенту",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к комментариям",
        )

    # Получаем комментарии в порядке их создания.
    comments = db.scalars(
        select(SubtaskComment)
        .where(SubtaskComment.subtask_id == subtask.id)
        .order_by(SubtaskComment.created_at)
    ).all()

    return comments
