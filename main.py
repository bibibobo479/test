from fastapi import FastAPI

from database import Base, engine
import models


app = FastAPI(
    title="GameDev Journal API"
)


Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "GameDev Journal API работает"
    }
