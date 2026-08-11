from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import SourceConnection, GraphConfig, OntologyConfig
from app.repositories.connection_repository import SourceConnectionRepository, GraphConfigRepository, OntologyConfigRepository
from app.schemas.metadata import SourceConnectionCreate, GraphConfigCreate
from app.schemas.ontology import OntologyConfigCreate
from app.connectors.factory import ConnectorFactory
from app.utilities.encryption import cipher
from datetime import datetime, timezone


class ConnectorService:
    def __init__(self, db: Session):
        self.db = db
        self.conn_repo = SourceConnectionRepository(db)
        self.graph_repo = GraphConfigRepository(db)
        self.onto_repo = OntologyConfigRepository(db)

    def create_source_connection(self, project_id: str, conn_in: SourceConnectionCreate) -> SourceConnection:
        enc_pwd = cipher.encrypt(conn_in.password) if conn_in.password else None
        conn = SourceConnection(
            project_id=project_id,
            name=conn_in.name,
            connector_type=conn_in.connector_type,
            host=conn_in.host,
            port=conn_in.port,
            database_name=conn_in.database_name,
            username=conn_in.username,
            encrypted_password=enc_pwd,
            connection_options_json=conn_in.connection_options_json,
            is_active=True
        )
        return self.conn_repo.create(conn)

    def get_source_connections(self, project_id: str) -> List[SourceConnection]:
        return self.conn_repo.get_by_project(project_id)

    def update_source_connection(self, connection_id: str, conn_in: SourceConnectionCreate) -> Optional[SourceConnection]:
        conn = self.conn_repo.get_by_id(connection_id)
        if not conn:
            return None
        update_data = {
            "name": conn_in.name,
            "connector_type": conn_in.connector_type,
            "host": conn_in.host,
            "port": conn_in.port,
            "database_name": conn_in.database_name,
            "username": conn_in.username,
        }
        if conn_in.password:
            update_data["encrypted_password"] = cipher.encrypt(conn_in.password)
        if conn_in.connection_options_json is not None:
            update_data["connection_options_json"] = conn_in.connection_options_json
        return self.conn_repo.update(conn, update_data)

    def delete_source_connection(self, connection_id: str) -> bool:
        conn = self.conn_repo.get_by_id(connection_id)
        if conn:
            from app.models.domain import MetadataTable
            self.db.query(MetadataTable).filter(MetadataTable.source_connection_id == conn.id).update({"source_connection_id": None})
            self.db.commit()
            return self.conn_repo.delete(conn)
        return False

    def test_source_connection(self, connection_id: str) -> bool:
        conn = self.conn_repo.get_by_id(connection_id)
        if not conn:
            raise ValueError("Connection not found")

        decrypted_pwd = cipher.decrypt(conn.encrypted_password) if conn.encrypted_password else None
        params = {
            "host": conn.host,
            "port": conn.port,
            "database_name": conn.database_name,
            "username": conn.username,
            "password": decrypted_pwd,
            "options": conn.connection_options_json
        }
        connector = ConnectorFactory.get_connector(conn.connector_type, params)
        success = connector.test_connection()

        self.conn_repo.update(conn, {
            "last_tested_at": datetime.now(timezone.utc),
            "last_status": "SUCCESS" if success else "FAILED"
        })
        return success

    def create_graph_config(self, project_id: str, graph_in: GraphConfigCreate) -> GraphConfig:
        enc_pwd = cipher.encrypt(graph_in.password) if graph_in.password else None
        cfg = GraphConfig(
            project_id=project_id,
            name=graph_in.name,
            target_type=graph_in.target_type,
            host=graph_in.host,
            port=graph_in.port,
            database_name=graph_in.database_name,
            username=graph_in.username,
            encrypted_password=enc_pwd,
            options_json=graph_in.options_json
        )
        return self.graph_repo.create(cfg)

    def get_graph_configs(self, project_id: str) -> List[GraphConfig]:
        return self.graph_repo.get_by_project(project_id)

    def create_or_update_ontology_config(self, project_id: str, onto_in: OntologyConfigCreate) -> OntologyConfig:
        existing = self.onto_repo.get_by_project(project_id)
        if existing:
            return self.onto_repo.update(existing, onto_in.model_dump())
        else:
            cfg = OntologyConfig(
                project_id=project_id,
                ontology_name=onto_in.ontology_name,
                base_iri=onto_in.base_iri,
                prefix=onto_in.prefix,
                version=onto_in.version,
                description=onto_in.description
            )
            return self.onto_repo.create(cfg)

    def get_ontology_config(self, project_id: str) -> Optional[OntologyConfig]:
        return self.onto_repo.get_by_project(project_id)
