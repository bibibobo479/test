from fastapi import FastAPI

from database import Base, engine
import models

from routers.auth import router as auth_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="GameDev Journal API",
    version="1.0"
)


app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "GameDev Journal API работает"
    }
