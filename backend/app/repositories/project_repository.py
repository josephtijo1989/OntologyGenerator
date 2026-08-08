from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import Project, ProjectStatus
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, db: Session):
        super().__init__(Project, db)

    def get_by_code(self, code: str) -> Optional[Project]:
        return self.db.query(Project).filter(Project.code == code).first()

    def get_user_projects(self, user_id: str, include_archived: bool = False) -> List[Project]:
        query = self.db.query(Project).filter(Project.owner_id == user_id)
        if not include_archived:
            query = query.filter(Project.status != ProjectStatus.ARCHIVED)
        return query.order_by(Project.updated_at.desc()).all()
