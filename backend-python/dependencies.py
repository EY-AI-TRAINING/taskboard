"""Dependency wiring: Session -> Repository -> Service.

Tests override `get_task_service` (or `get_task_repository`) to swap in a
fake, so no database is needed to exercise the routers.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from repositories.task_repository import TaskRepository
from services.task_service import TaskService


def get_task_repository(session: AsyncSession = Depends(get_session)) -> TaskRepository:
    return TaskRepository(session)


def get_task_service(
    repository: TaskRepository = Depends(get_task_repository),
) -> TaskService:
    return TaskService(repository)
