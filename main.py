from fastapi import FastAPI

from database import Base, engine
import models

from routers.lessons import router as lessons_router
from routers.auth import router as auth_router
from routers.groups import router as groups_router
from routers.tasks import router as tasks_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="GameDev Journal API",
    version="1.0"
)


app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(lessons_router)
app.include_router(tasks_router)

@app.get("/")
def root():
    return {
        "message": "GameDev Journal API работает"
    }
