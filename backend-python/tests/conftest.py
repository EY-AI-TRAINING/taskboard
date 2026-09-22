"""Test fixtures.

These tests never touch PostgreSQL. In-memory fake repositories are injected
in place of the real ones, so the router + service + schema stack is exercised
end to end without a database.
"""
from collections.abc import Sequence
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from dependencies import get_comment_repository, get_task_repository
from main import app
from models.comment import Comment
from models.task import Task


class FakeTaskRepository:
    """List-backed stand-in for TaskRepository with the same async surface."""

    def __init__(self) -> None:
        self._tasks: dict[int, Task] = {}
        self._comments: dict[int, Comment] = {}
        self._next_id = 1
        self._next_comment_id = 1

    def seed(self, **kwargs) -> Task:
        now = datetime(2026, 1, 1, 12, 0, 0)
        task = Task(
            id=self._next_id,
            title=kwargs.get("title", "Seed task"),
            description=kwargs.get("description"),
            status=kwargs.get("status", "todo"),
            assignee=kwargs.get("assignee"),
            created_at=now,
            updated_at=now,
        )
        self._tasks[task.id] = task
        self._next_id += 1
        return task

    async def list(self, status: str | None = None) -> Sequence[Task]:
        rows = sorted(self._tasks.values(), key=lambda t: t.id)
        return [t for t in rows if status is None or t.status == status]

    async def count(self, status: str | None = None) -> int:
        return len(await self.list(status))

    async def get(self, task_id: int) -> Task | None:
        return self._tasks.get(task_id)

    async def add(self, task: Task) -> Task:
        task.id = self._next_id
        self._next_id += 1
        now = datetime(2026, 1, 1, 12, 0, 0)
        task.created_at = now
        task.updated_at = now
        self._tasks[task.id] = task
        return task

    async def update(self, task: Task) -> Task:
        task.updated_at = datetime(2026, 1, 2, 12, 0, 0)
        self._tasks[task.id] = task
        return task

    async def delete(self, task: Task) -> None:
        self._tasks.pop(task.id, None)
        self._comments = {
            cid: comment for cid, comment in self._comments.items() if comment.task_id != task.id
        }


class FakeCommentRepository:
    """List-backed stand-in sharing storage with FakeTaskRepository."""

    def __init__(self, tasks: FakeTaskRepository) -> None:
        self._tasks = tasks

    def seed(self, task_id: int, author: str = "Ana", body: str = "Hello", minutes: int = 0) -> Comment:
        now = datetime(2026, 1, 1, 12, 0, 0) + timedelta(minutes=minutes)
        comment = Comment(
            id=self._tasks._next_comment_id,
            task_id=task_id,
            author=author,
            body=body,
            created_at=now,
        )
        self._tasks._comments[comment.id] = comment
        self._tasks._next_comment_id += 1
        return comment

    async def list_by_task(self, task_id: int) -> Sequence[Comment]:
        rows = [c for c in self._tasks._comments.values() if c.task_id == task_id]
        return sorted(rows, key=lambda c: (c.created_at, c.id))

    async def get(self, comment_id: int) -> Comment | None:
        return self._tasks._comments.get(comment_id)

    async def add(self, comment: Comment) -> Comment:
        comment.id = self._tasks._next_comment_id
        self._tasks._next_comment_id += 1
        comment.created_at = datetime(2026, 1, 1, 12, 0, 0)
        self._tasks._comments[comment.id] = comment
        return comment

    async def delete(self, comment: Comment) -> None:
        self._tasks._comments.pop(comment.id, None)

    async def count_for_task(self, task_id: int) -> int:
        return len([c for c in self._tasks._comments.values() if c.task_id == task_id])

    async def counts_for(self, task_ids: Sequence[int]) -> dict[int, int]:
        wanted = set(task_ids)
        counts: dict[int, int] = {tid: 0 for tid in wanted}
        for comment in self._tasks._comments.values():
            if comment.task_id in wanted:
                counts[comment.task_id] = counts.get(comment.task_id, 0) + 1
        return counts


@pytest.fixture
def fake_repo() -> FakeTaskRepository:
    return FakeTaskRepository()


@pytest.fixture
def fake_comments(fake_repo: FakeTaskRepository) -> FakeCommentRepository:
    return FakeCommentRepository(fake_repo)


@pytest_asyncio.fixture
async def client(fake_repo: FakeTaskRepository, fake_comments: FakeCommentRepository):
    app.dependency_overrides[get_task_repository] = lambda: fake_repo
    app.dependency_overrides[get_comment_repository] = lambda: fake_comments
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
