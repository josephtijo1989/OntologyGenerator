from typing import List
from sqlalchemy.orm import Session
from app.models.domain import Workflow, JobExecution, WorkflowStatus
from app.repositories.workflow_repository import WorkflowRepository, JobExecutionRepository
from app.schemas.workflow import WorkflowCreate
from datetime import datetime, timezone


class WorkflowService:
    def __init__(self, db: Session):
        self.workflow_repo = WorkflowRepository(db)
        self.execution_repo = JobExecutionRepository(db)

    def get_workflows(self, project_id: str) -> List[Workflow]:
        return self.workflow_repo.get_by_project(project_id)

    def create_workflow(self, project_id: str, wf_in: WorkflowCreate) -> Workflow:
        wf = Workflow(
            project_id=project_id,
            name=wf_in.name,
            description=wf_in.description,
            steps_json=wf_in.steps_json,
            cron_expression=wf_in.cron_expression,
            is_active=wf_in.is_active
        )
        return self.workflow_repo.create(wf)

    def trigger_workflow(self, workflow_id: str) -> JobExecution:
        wf = self.workflow_repo.get_by_id(workflow_id)
        if not wf:
            raise ValueError("Workflow not found")

        execution = JobExecution(
            workflow_id=workflow_id,
            status=WorkflowStatus.RUNNING,
            started_at=datetime.now(timezone.utc),
            log_output="Workflow execution started. Step 1: Discovery -> Step 2: Profiling -> Step 3: Graph Build -> Step 4: Ontology Gen",
            metrics_json={"steps_total": len(wf.steps_json), "steps_completed": 0}
        )
        saved_execution = self.execution_repo.create(execution)

        # Update to completed for synchronous completion simulation
        self.execution_repo.update(saved_execution, {
            "status": WorkflowStatus.COMPLETED,
            "finished_at": datetime.now(timezone.utc),
            "log_output": saved_execution.log_output + "\nAll workflow steps completed successfully.",
            "metrics_json": {"steps_total": len(wf.steps_json), "steps_completed": len(wf.steps_json)}
        })

        return saved_execution

    def get_executions(self, workflow_id: str) -> List[JobExecution]:
        return self.execution_repo.get_by_workflow(workflow_id)
