"""Task Board API — FastAPI application entry point.

Run:  uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import tasks

app = FastAPI(title="Engineering Task Board API", version="0.1.0")

# Lock CORS to the dev frontend origin. "*" with credentials is rejected by
# browsers and teaches the wrong habit.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
