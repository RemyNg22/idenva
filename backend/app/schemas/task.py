from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "normal"
    due_date: datetime | None = None
    related_type: str | None = "account"
    related_id: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    status: str
    priority: str
    due_date: datetime | None
    related_type: str | None
    related_id: str | None
    created_at: datetime
    updated_at: datetime