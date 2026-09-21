"""Unit tests for CommentService against in-memory fakes."""
import pytest

from schemas.comment import CommentCreate
from services.comment_service import CommentService
from services.errors import CommentNotFound, TaskNotFound
from tests.conftest import FakeCommentRepository, FakeTaskRepository


@pytest.fixture
def tasks() -> FakeTaskRepository:
    return FakeTaskRepository()


@pytest.fixture
def service(tasks: FakeTaskRepository) -> CommentService:
    return CommentService(FakeCommentRepository(tasks), tasks)


async def test_list_missing_task_raises(service):
    with pytest.raises(TaskNotFound):
        await service.list_comments(42)


async def test_list_returns_oldest_first(tasks, service):
    task = tasks.seed()
    comments = FakeCommentRepository(tasks)
    comments.seed(task.id, body="Second", minutes=5)
    comments.seed(task.id, body="First", minutes=0)
    service = CommentService(comments, tasks)
    listed = await service.list_comments(task.id)
    assert [c.body for c in listed] == ["First", "Second"]


async def test_create_trims_fields(tasks, service):
    task = tasks.seed()
    created = await service.create_comment(
        task.id, CommentCreate(author="  Ana  ", body="  Hello  ")
    )
    assert created.author == "Ana"
    assert created.body == "Hello"


async def test_delete_missing_raises(tasks, service):
    task = tasks.seed()
    with pytest.raises(CommentNotFound):
        await service.delete_comment(task.id, 99)


async def test_create_rejects_missing_task(service):
    with pytest.raises(TaskNotFound):
        await service.create_comment(9, CommentCreate(author="Ana", body="Hi"))


async def test_delete_wrong_task_raises(tasks, service):
    a = tasks.seed()
    b = tasks.seed()
    comments = FakeCommentRepository(tasks)
    comment = comments.seed(a.id)
    service = CommentService(comments, tasks)
    with pytest.raises(CommentNotFound):
        await service.delete_comment(b.id, comment.id)
