from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import Workflow, JobExecution
from app.repositories.base import BaseRepository


class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self, db: Session):
        super().__init__(Workflow, db)

    def get_by_project(self, project_id: str) -> List[Workflow]:
        return self.db.query(Workflow).filter(Workflow.project_id == project_id).all()


class JobExecutionRepository(BaseRepository[JobExecution]):
    def __init__(self, db: Session):
        super().__init__(JobExecution, db)

    def get_by_workflow(self, workflow_id: str) -> List[JobExecution]:
        return self.db.query(JobExecution).filter(JobExecution.workflow_id == workflow_id).order_by(JobExecution.started_at.desc()).all()
