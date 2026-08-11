from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.domain import WorkflowStatus


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps_json: List[Dict[str, Any]]
    cron_expression: Optional[str] = None
    is_active: bool = True


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    steps_json: List[Dict[str, Any]]
    cron_expression: Optional[str] = None
    is_active: bool
    created_at: datetime


class JobExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workflow_id: str
    status: WorkflowStatus
    started_at: datetime
    finished_at: Optional[datetime] = None
    log_output: Optional[str] = None
    metrics_json: Optional[Dict[str, Any]] = None
