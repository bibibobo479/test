from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
import models
from routers import stages
from routers.lessons import router as lessons_router
from routers.auth import router as auth_router
from routers.groups import router as groups_router
from routers.tasks import router as tasks_router
from routers.subtasks import router as subtasks_router



Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="GameDev Journal API",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(lessons_router)
app.include_router(tasks_router)
app.include_router(subtasks_router)
app.include_router(stages.router)
@app.get("/")
def root():
    return {
        "message": "GameDev Journal API работает"
    }
