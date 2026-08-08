from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.domain import MetadataTable, MetadataColumn, OntologyClass
from app.repositories.project_repository import ProjectRepository
from app.repositories.connection_repository import SourceConnectionRepository, GraphConfigRepository
from app.repositories.rule_repository import BusinessRuleRepository
from app.repositories.workflow_repository import WorkflowRepository


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.proj_repo = ProjectRepository(db)
        self.conn_repo = SourceConnectionRepository(db)
        self.graph_repo = GraphConfigRepository(db)
        self.rule_repo = BusinessRuleRepository(db)
        self.wf_repo = WorkflowRepository(db)

    def get_dashboard_metrics(self, project_id: str) -> Dict[str, Any]:
        project = self.proj_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")

        source_conns = self.conn_repo.get_by_project(project_id)
        graph_cfgs = self.graph_repo.get_by_project(project_id)
        tables = self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).all()
        onto_classes = self.db.query(OntologyClass).filter(OntologyClass.project_id == project_id).all()
        rules = self.rule_repo.get_by_project(project_id)
        workflows = self.wf_repo.get_by_project(project_id)

        total_tables = len(tables)
        total_columns = sum(len(tbl.columns) for tbl in tables)
        total_fks = sum(sum(1 for col in tbl.columns if col.is_foreign_key) for tbl in tables)

        domain_counts = {}
        for c in onto_classes:
            dtype = c.domain_type or "Transactional"
            domain_counts[dtype] = domain_counts.get(dtype, 0) + 1

        return {
            "project_name": project.name,
            "project_code": project.code,
            "source_connections_count": len(source_conns),
            "graph_configs_count": len(graph_cfgs),
            "total_tables_discovered": total_tables,
            "total_columns_discovered": total_columns,
            "total_relationships_inferred": total_fks,
            "domain_classification": domain_counts,
            "business_rules_active": sum(1 for r in rules if r.is_active),
            "workflows_configured": len(workflows),
            "system_health": "HEALTHY"
        }
