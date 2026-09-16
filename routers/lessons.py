from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db

from schemas.lessons import (
    LessonCreate,
    LessonResponse
)

from models.group import Group
from models.group_member import GroupMember
from models.user import User
from models.lesson import Lesson

from security import (
    get_current_user,
    require_teacher,
)


router = APIRouter(
    prefix="/lessons",
    tags=["Занятия"],
)


# =========================================================
# Создание занятия
# Только преподаватель
# =========================================================

@router.post(
    "",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED
)
def create_lesson(
    data: LessonCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    # Ищем группу
    group = db.get(
        Group,
        data.group_id
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Группа не найдена"
        )

    # Проверяем, что преподаватель
    # является владельцем группы
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете создавать занятия для чужой группы"
        )

    # Создаём занятие
    lesson = Lesson(
        title=data.title,
        lesson_date=data.lesson_date,
        start_time=data.start_time,
        end_time=data.end_time,
        classroom=data.classroom,
        meeting_url=(
            str(data.meeting_url)
            if data.meeting_url
            else None
        ),
        group_id=data.group_id,
        teacher_id=teacher.id
    )

    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return lesson


# =========================================================
# Получение списка занятий
#
# teacher -> занятия, созданные преподавателем
# student -> занятия групп, в которых он состоит
# =========================================================

@router.get(
    "",
    response_model=list[LessonResponse],
)
def get_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -------------------------
    # Преподаватель
    # -------------------------

    if current_user.role == "teacher":
        lessons = db.scalars(
            select(Lesson)
            .where(
                Lesson.teacher_id == current_user.id
            )
            .order_by(
                Lesson.lesson_date,
                Lesson.start_time
            )
        ).all()

        return lessons

    # -------------------------
    # Учащийся
    # -------------------------

    if current_user.role == "student":
        lessons = db.scalars(
            select(Lesson)
            .join(
                GroupMember,
                GroupMember.group_id == Lesson.group_id
            )
            .where(
                GroupMember.student_id == current_user.id
            )
            .order_by(
                Lesson.lesson_date,
                Lesson.start_time
            )
        ).all()

        return lessons

    return []

@router.get(
    "/{lesson_id}",
    response_model=LessonResponse
)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Ищем занятие
    lesson = db.get(
        Lesson,
        lesson_id
    )

    # 2. Проверяем существование
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Занятие не найдено",
        )

    # 3. Проверяем преподавателя
    if current_user.role == "teacher":

        if lesson.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому занятию",
            )

        return lesson

    # 4. Проверяем студента
    if current_user.role == "student":

        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == lesson.group_id,
                GroupMember.student_id == current_user.id,
            )
        )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому занятию",
            )

        return lesson

    # 5. На случай неизвестной роли
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа",
    )


@router.delete(
    "/{lesson_id}"
)
def remove_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    # 1. Ищем занятие
    lesson = db.get(
        Lesson,
        lesson_id
    )

    # 2. Проверяем существование
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Занятие не найдено",
        )

    # 3. Проверяем владельца
    if lesson.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете удалить чужое занятие",
        )

    # 4. Удаляем
    db.delete(lesson)
    db.commit()

    # 5. Возвращаем результат
    return {
        "message": "Занятие удалено"
    }
