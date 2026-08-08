from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import Project, ProjectStatus
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectClone
from app.utilities.logger import logger


class ProjectService:
    def __init__(self, db: Session):
        self.project_repo = ProjectRepository(db)

    def get_projects(self, user_id: str) -> List[Project]:
        return self.project_repo.get_user_projects(user_id=user_id)

    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        return self.project_repo.get_by_id(project_id)

    def create_project(self, user_id: str, project_in: ProjectCreate) -> Project:
        existing = self.project_repo.get_by_code(project_in.code)
        if existing:
            raise ValueError(f"Project with code {project_in.code} already exists")

        new_project = Project(
            name=project_in.name,
            code=project_in.code,
            description=project_in.description,
            owner_id=user_id,
            status=ProjectStatus.ACTIVE
        )
        return self.project_repo.create(new_project)

    def update_project(self, project_id: str, project_in: ProjectUpdate) -> Project:
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        update_data = project_in.model_dump(exclude_unset=True)
        return self.project_repo.update(project, update_data)

    def archive_project(self, project_id: str) -> Project:
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        return self.project_repo.update(project, {"status": ProjectStatus.ARCHIVED})

    def clone_project(self, project_id: str, user_id: str, clone_in: ProjectClone) -> Project:
        source_proj = self.project_repo.get_by_id(project_id)
        if not source_proj:
            raise ValueError("Source project not found")

        cloned_proj = Project(
            name=clone_in.new_name,
            code=clone_in.new_code,
            description=f"Cloned from {source_proj.name}. {source_proj.description or ''}",
            owner_id=user_id,
            status=ProjectStatus.ACTIVE
        )
        return self.project_repo.create(cloned_proj)

    def delete_project(self, project_id: str) -> bool:
        return self.project_repo.delete(project_id)
