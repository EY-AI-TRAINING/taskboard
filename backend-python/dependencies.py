"""Dependency wiring: Session -> Repository -> Service.

Tests override `get_task_repository` / `get_comment_repository` to swap in
fakes, so no database is needed to exercise the routers.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from repositories.comment_repository import CommentRepository
from repositories.task_repository import TaskRepository
from services.comment_service import CommentService
from services.task_service import TaskService


def get_task_repository(session: AsyncSession = Depends(get_session)) -> TaskRepository:
    return TaskRepository(session)


def get_comment_repository(session: AsyncSession = Depends(get_session)) -> CommentRepository:
    return CommentRepository(session)


def get_task_service(
    repository: TaskRepository = Depends(get_task_repository),
    comments: CommentRepository = Depends(get_comment_repository),
) -> TaskService:
    return TaskService(repository, comments)


def get_comment_service(
    comments: CommentRepository = Depends(get_comment_repository),
    tasks: TaskRepository = Depends(get_task_repository),
) -> CommentService:
    return CommentService(comments, tasks)
