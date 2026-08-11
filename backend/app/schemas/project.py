from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.domain import ProjectStatus


class ProjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectClone(BaseModel):
    new_name: str
    new_code: str


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    description: Optional[str] = None
    status: ProjectStatus
    owner_id: str
    created_at: datetime
    updated_at: datetime
