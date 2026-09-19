"""Business logic for tasks. Depends on a repository-shaped object, not on
SQLAlchemy directly — which is what makes it unit-testable with a fake."""
from collections.abc import Sequence
from typing import Protocol

from models.task import Task
from schemas.task import VALID_STATUSES, TaskCreate, TaskUpdate
from services.errors import InvalidStatus, TaskNotFound


class TaskRepositoryProtocol(Protocol):
    async def list(self, status: str | None = None) -> Sequence[Task]: ...
    async def count(self, status: str | None = None) -> int: ...
    async def get(self, task_id: int) -> Task | None: ...
    async def add(self, task: Task) -> Task: ...
    async def update(self, task: Task) -> Task: ...
    async def delete(self, task: Task) -> None: ...


class TaskService:
    def __init__(self, repository: TaskRepositoryProtocol) -> None:
        self._repo = repository

    @staticmethod
    def _validate_status(status: str) -> None:
        if status not in VALID_STATUSES:
            raise InvalidStatus(status)

    async def list_tasks(self, status: str | None = None) -> Sequence[Task]:
        if status is not None:
            self._validate_status(status)
        return await self._repo.list(status)

    async def count_tasks(self, status: str | None = None) -> int:
        if status is not None:
            self._validate_status(status)
        return await self._repo.count(status)

    async def get_task(self, task_id: int) -> Task:
        task = await self._repo.get(task_id)
        if task is None:
            raise TaskNotFound(task_id)
        return task

    async def create_task(self, data: TaskCreate) -> Task:
        self._validate_status(data.status)
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status,
            assignee=data.assignee,
        )
        return await self._repo.add(task)

    async def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        self._validate_status(data.status)
        task = await self.get_task(task_id)
        task.title = data.title
        task.description = data.description
        task.status = data.status
        task.assignee = data.assignee
        return await self._repo.update(task)

    async def delete_task(self, task_id: int) -> None:
        task = await self.get_task(task_id)
        await self._repo.delete(task)
