from pydantic import BaseModel, ConfigDict, Field


# Создание группы преподавателем
class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)


# Ответ API с информацией о группе
class GroupResponse(BaseModel):
    id: int
    name: str
    teacher_id: int
    invite_code: str

    model_config = ConfigDict(from_attributes=True)


# Добавление учащегося преподавателем
class AddStudentRequest(BaseModel):
    student_id: int


# Самостоятельное вступление учащегося
# по коду группы
class JoinGroupRequest(BaseModel):
    invite_code: str = Field(min_length=6, max_length=20)
