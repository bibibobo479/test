from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from models.group import Group
from models.group_member import GroupMember
from models.stage import Stage
from models.user import User

from schemas.stage import (
    StageCreate,
    StageResponse,
    StageStatusUpdate,
    StageUpdate,
)

from security import get_current_user

router = APIRouter(
    prefix="/stages",
    tags=["Этапы"],
)


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================


def get_stage_or_404(
    db: Session,
    stage_id: int,
) -> Stage:
    """Получить этап или вернуть ошибку 404."""

    stage = db.get(Stage, stage_id)

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Этап не найден",
        )

    return stage


def get_group_or_404(
    db: Session,
    group_id: int,
) -> Group:
    """Получить проект или вернуть ошибку 404."""

    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    return group


def check_teacher_access(
    group: Group,
    current_user: User,
) -> None:
    """
    Проверить права преподавателя на управление проектом.

    Изменять этапы может только преподаватель,
    которому принадлежит проект.
    """

    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Управлять этапами может только преподаватель",
        )

    if group.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Это проект другого преподавателя",
        )


def check_stage_read_access(
    db: Session,
    group: Group,
    current_user: User,
) -> None:
    """
    Проверить право пользователя просматривать этапы проекта.

    Преподаватель видит этапы своих проектов.
    Студент видит этапы проектов, в которых он состоит.
    """

    if current_user.role == "teacher":
        if group.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Это проект другого преподавателя",
            )

        return

    if current_user.role == "student":
        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.student_id == current_user.id,
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не состоите в этом проекте",
            )

        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к этапам проекта",
    )


# ============================================================
# СОЗДАНИЕ ЭТАПА
# ============================================================


@router.post(
    "/group/{group_id}",
    response_model=StageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_stage(
    group_id: int,
    data: StageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать новый этап проекта."""

    # Получаем проект.
    group = get_group_or_404(
        db=db,
        group_id=group_id,
    )

    # Создавать этапы может только преподаватель,
    # которому принадлежит проект.
    check_teacher_access(
        group=group,
        current_user=current_user,
    )

    # Проверяем корректность дат.
    if (
        data.start_date is not None
        and data.deadline is not None
        and data.deadline < data.start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок завершения не может быть раньше даты начала",
        )

    # Создаём этап.
    stage = Stage(
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        deadline=data.deadline,
        expected_result=data.expected_result,
        group_id=group.id,
    )

    db.add(stage)
    db.commit()
    db.refresh(stage)

    return stage


# ============================================================
# ПОЛУЧЕНИЕ ВСЕХ ЭТАПОВ ПРОЕКТА
# ============================================================


@router.get(
    "/group/{group_id}",
    response_model=list[StageResponse],
)
def get_group_stages(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить все этапы конкретного проекта."""

    # Получаем проект.
    group = get_group_or_404(
        db=db,
        group_id=group_id,
    )

    # Проверяем право пользователя видеть проект.
    check_stage_read_access(
        db=db,
        group=group,
        current_user=current_user,
    )

    # Получаем этапы проекта.
    stages = db.scalars(
        select(Stage)
        .where(Stage.group_id == group.id)
        .order_by(Stage.start_date, Stage.id)
    ).all()

    return stages


# ============================================================
# ПОЛУЧЕНИЕ ОДНОГО ЭТАПА
# ============================================================


@router.get(
    "/{stage_id}",
    response_model=StageResponse,
)
def get_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить этап по его ID."""

    # Получаем этап.
    stage = get_stage_or_404(
        db=db,
        stage_id=stage_id,
    )

    # Получаем проект, которому принадлежит этап.
    group = get_group_or_404(
        db=db,
        group_id=stage.group_id,
    )

    # Проверяем право просмотра.
    check_stage_read_access(
        db=db,
        group=group,
        current_user=current_user,
    )

    return stage


# ============================================================
# ИЗМЕНЕНИЕ ЭТАПА
# ============================================================


@router.patch(
    "/{stage_id}",
    response_model=StageResponse,
)
def update_stage(
    stage_id: int,
    data: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Изменить данные этапа проекта."""

    # Получаем этап.
    stage = get_stage_or_404(
        db=db,
        stage_id=stage_id,
    )

    # Получаем проект этапа.
    group = get_group_or_404(
        db=db,
        group_id=stage.group_id,
    )

    # Изменять этап может только преподаватель,
    # которому принадлежит проект.
    check_teacher_access(
        group=group,
        current_user=current_user,
    )

    # Обновляем только те поля, которые клиент
    # действительно передал в запросе.
    update_data = data.model_dump(
        exclude_unset=True,
    )

    for field, value in update_data.items():
        setattr(stage, field, value)

    # После изменения проверяем корректность дат.
    if (
        stage.start_date is not None
        and stage.deadline is not None
        and stage.deadline < stage.start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок завершения не может быть раньше даты начала",
        )

    db.commit()
    db.refresh(stage)

    return stage


# ============================================================
# ИЗМЕНЕНИЕ СТАТУСА ЭТАПА
# ============================================================


@router.patch(
    "/{stage_id}/status",
    response_model=StageResponse,
)
def update_stage_status(
    stage_id: int,
    data: StageStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Изменить статус этапа проекта."""

    # Получаем этап.
    stage = get_stage_or_404(
        db=db,
        stage_id=stage_id,
    )

    # Получаем проект этапа.
    group = get_group_or_404(
        db=db,
        group_id=stage.group_id,
    )

    # Статус этапа изменяет преподаватель.
    check_teacher_access(
        group=group,
        current_user=current_user,
    )

    stage.status = data.status

    db.commit()
    db.refresh(stage)

    return stage


# ============================================================
# УДАЛЕНИЕ ЭТАПА
# ============================================================


@router.delete(
    "/{stage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить этап проекта."""

    # Получаем этап.
    stage = get_stage_or_404(
        db=db,
        stage_id=stage_id,
    )

    # Получаем проект этапа.
    group = get_group_or_404(
        db=db,
        group_id=stage.group_id,
    )

    # Удалять этап может только преподаватель,
    # которому принадлежит проект.
    check_teacher_access(
        group=group,
        current_user=current_user,
    )

    # Не разрешаем удалить этап, если внутри
    # него уже существуют основные задачи (Epics).
    if stage.tasks:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить этап, содержащий задачи",
        )

    db.delete(stage)
    db.commit()

    return None
