"""Business logic for comments. Depends on repository-shaped objects, not SQLAlchemy."""
from collections.abc import Sequence
from typing import Protocol

from models.comment import Comment
from models.task import Task
from schemas.comment import CommentCreate
from services.errors import CommentNotFound, InvalidComment, TaskNotFound


class TaskLookup(Protocol):
    async def get(self, task_id: int) -> Task | None: ...


class CommentRepositoryProtocol(Protocol):
    async def list_by_task(self, task_id: int) -> Sequence[Comment]: ...
    async def get(self, comment_id: int) -> Comment | None: ...
    async def add(self, comment: Comment) -> Comment: ...
    async def delete(self, comment: Comment) -> None: ...
    async def counts_for(self, task_ids: Sequence[int]) -> dict[int, int]: ...


def _validated_fields(author: str, body: str) -> tuple[str, str]:
    author = (author or "").strip()
    body = (body or "").strip()
    if not author or not body:
        raise InvalidComment("author and body are required")
    if len(author) > 100:
        raise InvalidComment("author must be 1-100 characters")
    if len(body) > 500:
        raise InvalidComment("body must be 1-500 characters")
    return author, body


class CommentService:
    def __init__(self, comments: CommentRepositoryProtocol, tasks: TaskLookup) -> None:
        self._comments = comments
        self._tasks = tasks

    async def _require_task(self, task_id: int) -> Task:
        task = await self._tasks.get(task_id)
        if task is None:
            raise TaskNotFound(task_id)
        return task

    async def list_comments(self, task_id: int) -> Sequence[Comment]:
        await self._require_task(task_id)
        return await self._comments.list_by_task(task_id)

    async def create_comment(self, task_id: int, data: CommentCreate) -> Comment:
        await self._require_task(task_id)
        author, body = _validated_fields(data.author, data.body)
        comment = Comment(task_id=task_id, author=author, body=body)
        return await self._comments.add(comment)

    async def delete_comment(self, task_id: int, comment_id: int) -> None:
        await self._require_task(task_id)
        comment = await self._comments.get(comment_id)
        if comment is None or comment.task_id != task_id:
            raise CommentNotFound(comment_id)
        await self._comments.delete(comment)

    async def counts_for(self, task_ids: Sequence[int]) -> dict[int, int]:
        return await self._comments.counts_for(task_ids)
