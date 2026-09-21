"""HTTP layer for /api/tasks. Translates domain errors into status codes."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from dependencies import get_comment_service, get_task_service
from schemas.comment import CommentCreate, CommentRead
from schemas.task import TaskCount, TaskCreate, TaskRead, TaskUpdate
from services.comment_service import CommentService
from services.errors import CommentNotFound, InvalidComment, InvalidStatus, TaskNotFound
from services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    status: str | None = Query(default=None, description="Filter by task status"),
    service: TaskService = Depends(get_task_service),
) -> list[TaskRead]:
    try:
        tasks = await service.list_tasks(status)
    except InvalidStatus as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return [TaskRead.model_validate(t) for t in tasks]


# Declared before /{task_id} so "count" isn't parsed as a task id.
@router.get("/count", response_model=TaskCount)
async def count_tasks(
    status: str | None = Query(default=None, description="Filter by task status"),
    service: TaskService = Depends(get_task_service),
) -> TaskCount:
    try:
        total = await service.count_tasks(status)
    except InvalidStatus as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TaskCount(count=total)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    try:
        return TaskRead.model_validate(await service.get_task(task_id))
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    try:
        return TaskRead.model_validate(await service.create_task(payload))
    except InvalidStatus as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    try:
        return TaskRead.model_validate(await service.update_task(task_id, payload))
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidStatus as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> Response:
    try:
        await service.delete_task(task_id)
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{task_id}/comments", response_model=list[CommentRead])
async def list_comments(
    task_id: int,
    service: CommentService = Depends(get_comment_service),
) -> list[CommentRead]:
    try:
        comments = await service.list_comments(task_id)
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [CommentRead.model_validate(c) for c in comments]


@router.post("/{task_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment(
    task_id: int,
    payload: CommentCreate,
    service: CommentService = Depends(get_comment_service),
) -> CommentRead:
    try:
        return CommentRead.model_validate(await service.create_comment(task_id, payload))
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidComment as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{task_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    task_id: int,
    comment_id: int,
    service: CommentService = Depends(get_comment_service),
) -> Response:
    try:
        await service.delete_comment(task_id, comment_id)
    except (TaskNotFound, CommentNotFound) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
