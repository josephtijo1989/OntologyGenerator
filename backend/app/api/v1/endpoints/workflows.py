from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.workflow import WorkflowCreate, WorkflowResponse, JobExecutionResponse
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/projects/{project_id}/workflows", tags=["Workflow Orchestration & Scheduler"])


@router.get("", response_model=List[WorkflowResponse])
def get_workflows(project_id: str, db: Session = Depends(get_db)):
    svc = WorkflowService(db)
    return svc.get_workflows(project_id)


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(project_id: str, wf_in: WorkflowCreate, db: Session = Depends(get_db)):
    svc = WorkflowService(db)
    return svc.create_workflow(project_id, wf_in)


@router.post("/{workflow_id}/trigger", response_model=JobExecutionResponse)
def trigger_workflow(project_id: str, workflow_id: str, db: Session = Depends(get_db)):
    svc = WorkflowService(db)
    try:
        return svc.trigger_workflow(workflow_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{workflow_id}/executions", response_model=List[JobExecutionResponse])
def get_executions(project_id: str, workflow_id: str, db: Session = Depends(get_db)):
    svc = WorkflowService(db)
    return svc.get_executions(workflow_id)
