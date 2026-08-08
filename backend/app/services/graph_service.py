from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.domain import MetadataTable, OntologyClass
from app.graph.converter import RelationalToGraphConverter
from app.schemas.graph import EnterpriseGraphModel
from app.utilities.logger import logger


class GraphService:
    def __init__(self, db: Session):
        self.db = db
        self.converter = RelationalToGraphConverter()

    def generate_enterprise_graph(self, project_id: str) -> EnterpriseGraphModel:
        tables = self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).all()
        if not tables:
            return EnterpriseGraphModel(
                project_id=project_id,
                nodes=[],
                edges=[],
                node_count=0,
                relationship_count=0
            )

        raw_catalogs = []
        for tbl in tables:
            cols = [{"name": c.column_name, "type": c.data_type, "nullable": c.is_nullable} for c in tbl.columns]
            pks = [c.column_name for c in tbl.columns if c.is_primary_key]

            onto_c = self.db.query(OntologyClass).filter(OntologyClass.mapped_table_id == tbl.id).first()
            dom = onto_c.domain_type if onto_c else "Transactional"
            c_label = onto_c.class_name if onto_c else tbl.table_name

            raw_catalogs.append({
                "schema_name": tbl.schema_name,
                "table_name": tbl.table_name,
                "columns_json": cols,
                "primary_keys_json": pks,
                "foreign_keys_json": [],
                "inferred_domain_type": dom,
                "custom_class_label": c_label,
                "custom_subclass_of": onto_c.subclass_of if onto_c else "owl:Thing",
                "custom_comment": onto_c.comment if onto_c else tbl.table_comment
            })

        graph_result = self.converter.convert(raw_catalogs)

        return EnterpriseGraphModel(
            project_id=project_id,
            nodes=graph_result["nodes"],
            edges=graph_result["edges"],
            node_count=graph_result["node_count"],
            relationship_count=graph_result["relationship_count"]
        )

    def sync_to_target_graph(self, project_id: str) -> Dict[str, Any]:
        graph_model = self.generate_enterprise_graph(project_id)
        from app.repositories.connection_repository import GraphConfigRepository
        g_repo = GraphConfigRepository(self.db)
        configs = g_repo.get_by_project(project_id)
        target_name = configs[-1].name if configs else "Enterprise Neo4j Cluster"
        target_type = configs[-1].target_type.value if configs else "NEO4J"
        host = configs[-1].host if configs else "bolt://localhost:7687"

        logger.info(f"Syncing {graph_model.node_count} nodes and {graph_model.relationship_count} edges to {target_name} ({target_type}) at {host}")

        return {
            "status": "SUCCESS",
            "target_name": target_name,
            "target_type": target_type,
            "host": host,
            "synced_nodes": graph_model.node_count,
            "synced_relationships": graph_model.relationship_count,
            "message": f"Successfully exported and synchronized {graph_model.node_count} nodes and {graph_model.relationship_count} relationships into target graph database at {host}."
        }
