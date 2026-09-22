"""Data-access layer for comments. Knows about SQLAlchemy; knows nothing about HTTP."""
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.comment import Comment


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_task(self, task_id: int) -> Sequence[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc(), Comment.id.asc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get(self, comment_id: int) -> Comment | None:
        return await self._session.get(Comment, comment_id)

    async def add(self, comment: Comment) -> Comment:
        self._session.add(comment)
        await self._session.flush()
        await self._session.refresh(comment)
        return comment

    async def delete(self, comment: Comment) -> None:
        await self._session.delete(comment)
        await self._session.flush()

    async def count_for_task(self, task_id: int) -> int:
        stmt = select(func.count()).select_from(Comment).where(Comment.task_id == task_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def counts_for(self, task_ids: Sequence[int]) -> dict[int, int]:
        if not task_ids:
            return {}
        stmt = (
            select(Comment.task_id, func.count())
            .where(Comment.task_id.in_(task_ids))
            .group_by(Comment.task_id)
        )
        result = await self._session.execute(stmt)
        return {task_id: count for task_id, count in result.all()}
