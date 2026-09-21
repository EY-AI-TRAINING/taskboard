"""Request/response models for the task API."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

VALID_STATUSES = ("todo", "in-progress", "done")


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assignee: str | None = Field(default=None, max_length=100)


class TaskCreate(TaskBase):
    status: str = "todo"


class TaskUpdate(TaskBase):
    status: str = "todo"


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime


class TaskCount(BaseModel):
    count: int
