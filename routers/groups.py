from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

import secrets
import string
from schemas.group import JoinGroupRequest

from models.group import Group
from models.group_member import GroupMember
from models.user import User

from schemas.group import (
    GroupCreate,
    GroupResponse,
    AddStudentRequest,
)

from security import (
    get_current_user,
    require_teacher,
)

router = APIRouter(
    prefix="/groups",
    tags=["Группы"],
)


# =========================================================
# Создание группы
# Только преподаватель
# =========================================================
def generate_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits

    return "".join(secrets.choice(alphabet) for _ in range(6))


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    existing_group = db.scalar(select(Group).where(Group.name == data.name))

    if existing_group:
        raise HTTPException(
            status_code=400, detail="Группа с таким названием уже существует"
        )

    # Генерируем уникальный код
    while True:
        invite_code = generate_invite_code()

        existing_code = db.scalar(select(Group).where(Group.invite_code == invite_code))

        if not existing_code:
            break

    group = Group(name=data.name, teacher_id=teacher.id, invite_code=invite_code)

    db.add(group)
    db.commit()
    db.refresh(group)

    return group


# =========================================================
# Получение списка групп
#
# teacher -> получает свои группы
# student -> получает группы, в которых состоит
# =========================================================


@router.get(
    "",
    response_model=list[GroupResponse],
)
def get_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -------------------------
    # Преподаватель
    # -------------------------

    if current_user.role == "teacher":
        groups = db.scalars(
            select(Group).where(Group.teacher_id == current_user.id)
        ).all()

        return groups

    # -------------------------
    # Учащийся
    # -------------------------

    if current_user.role == "student":
        groups = db.scalars(
            select(Group)
            .join(
                GroupMember,
                GroupMember.group_id == Group.id,
            )
            .where(GroupMember.student_id == current_user.id)
        ).all()

        return groups

    return []


# =========================================================
# Получение одной группы
# =========================================================


@router.get(
    "/{group_id}",
    response_model=GroupResponse,
)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # -------------------------
    # Если преподаватель
    # -------------------------

    if current_user.role == "teacher":
        if group.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой группе",
            )

        return group

    # -------------------------
    # Если учащийся
    # -------------------------

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
                detail="Нет доступа к этой группе",
            )

        return group

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа",
    )


# =========================================================
# Добавление учащегося в группу
# Только преподаватель
# =========================================================


@router.post(
    "/{group_id}/students",
    status_code=status.HTTP_201_CREATED,
)
def add_student(
    group_id: int,
    data: AddStudentRequest,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    # Ищем группу
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # Проверяем, принадлежит ли группа преподавателю
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Это не ваша группа",
        )

    # Ищем пользователя
    student = db.get(
        User,
        data.student_id,
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Учащийся не найден",
        )

    # Проверяем роль
    if student.role != "student":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не является учащимся",
        )

    # Проверяем, не находится ли он уже в группе
    existing_member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.student_id == student.id,
        )
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Учащийся уже находится в группе",
        )

    # Добавляем учащегося
    member = GroupMember(
        group_id=group.id,
        student_id=student.id,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return {
        "message": "Учащийся добавлен в группу",
        "group_id": group.id,
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
        },
    }


# =========================================================
# Получение учащихся конкретной группы
# =========================================================


@router.get(
    "/{group_id}/students",
)
def get_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # -------------------------
    # Проверка преподавателя
    # -------------------------

    if current_user.role == "teacher":
        if group.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой группе",
            )

    # -------------------------
    # Проверка учащегося
    # -------------------------

    elif current_user.role == "student":
        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.student_id == current_user.id,
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой группе",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа",
        )

    # Получаем всех учащихся группы
    students = db.execute(
        select(User, GroupMember.is_leader)
        .join(
            GroupMember,
            GroupMember.student_id == User.id,
        )
        .where(GroupMember.group_id == group_id)
        .order_by(User.name)
    ).all()

    return [
        {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "is_leader": is_leader,
        }
        for student, is_leader in students
    ]


# =========================================================
# Удаление учащегося из группы
# Только преподаватель
# =========================================================


@router.delete(
    "/{group_id}/students/{student_id}",
)
def remove_student(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # Преподаватель может менять только свои группы
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Это не ваша группа",
        )

    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.student_id == student_id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Учащийся не найден в этой группе",
        )

    db.delete(membership)
    db.commit()

    return {
        "message": "Учащийся удалён из группы",
    }


# =========================================================
# Удаление группы
# Только преподаватель
# =========================================================


@router.delete(
    "/{group_id}",
)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена",
        )

    # Нельзя удалить чужую группу
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Это не ваша группа",
        )

    db.delete(group)
    db.commit()

    return {
        "message": "Группа удалена",
    }


@router.post("/join")
def join_group(
    data: JoinGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403, detail="Только учащийся может вступить в группу"
        )

    code = data.invite_code.strip().upper()

    group = db.scalar(select(Group).where(Group.invite_code == code))

    if not group:
        raise HTTPException(status_code=404, detail="Неверный код группы")

    existing_member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.student_id == current_user.id
        )
    )

    if existing_member:
        raise HTTPException(status_code=400, detail="Вы уже состоите в этой группе")

    member = GroupMember(group_id=group.id, student_id=current_user.id)

    db.add(member)
    db.commit()

    return {
        "message": "Вы успешно вступили в группу",
        "group": {"id": group.id, "name": group.name},
    }
