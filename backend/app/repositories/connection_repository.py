from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import SourceConnection, GraphConfig, OntologyConfig
from app.repositories.base import BaseRepository


class SourceConnectionRepository(BaseRepository[SourceConnection]):
    def __init__(self, db: Session):
        super().__init__(SourceConnection, db)

    def get_by_project(self, project_id: str) -> List[SourceConnection]:
        return self.db.query(SourceConnection).filter(SourceConnection.project_id == project_id).all()


class GraphConfigRepository(BaseRepository[GraphConfig]):
    def __init__(self, db: Session):
        super().__init__(GraphConfig, db)

    def get_by_project(self, project_id: str) -> List[GraphConfig]:
        return self.db.query(GraphConfig).filter(GraphConfig.project_id == project_id).all()


class OntologyConfigRepository(BaseRepository[OntologyConfig]):
    def __init__(self, db: Session):
        super().__init__(OntologyConfig, db)

    def get_by_project(self, project_id: str) -> Optional[OntologyConfig]:
        return self.db.query(OntologyConfig).filter(OntologyConfig.project_id == project_id).first()
