from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import MetadataTable, ProfilingResult
from app.repositories.base import BaseRepository


class MetadataRepository(BaseRepository[MetadataTable]):
    def __init__(self, db: Session):
        super().__init__(MetadataTable, db)

    def get_by_project(self, project_id: str) -> List[MetadataTable]:
        return self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).all()

    def get_by_table(self, project_id: str, schema_name: str, table_name: str) -> Optional[MetadataTable]:
        return self.db.query(MetadataTable).filter(
            MetadataTable.project_id == project_id,
            MetadataTable.schema_name == schema_name,
            MetadataTable.table_name == table_name
        ).first()

    def delete_project_metadata(self, project_id: str):
        self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).delete()
        self.db.commit()

    def delete_connection_metadata(self, connection_id: str):
        self.db.query(MetadataTable).filter(MetadataTable.source_connection_id == connection_id).delete()
        self.db.commit()


class ProfilingRepository(BaseRepository[ProfilingResult]):
    def __init__(self, db: Session):
        super().__init__(ProfilingResult, db)

    def get_by_catalog_id(self, catalog_id: str) -> Optional[ProfilingResult]:
        return self.db.query(ProfilingResult).filter(ProfilingResult.metadata_catalog_id == catalog_id).first()
