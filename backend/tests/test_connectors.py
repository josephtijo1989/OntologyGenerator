import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.connectors.factory import ConnectorFactory
from app.connectors.mssql import MSSQLConnector
from app.connectors.mysql import MySQLConnector
from app.models.domain import SourceConnectorType

client = TestClient(app)


def test_mssql_connector_direct():
    params = {
        "host": "localhost",
        "port": 1433,
        "database_name": "TestMSSQL",
        "username": "sa",
        "password": "Password123!"
    }
    connector = ConnectorFactory.get_connector(SourceConnectorType.MSSQL, params)
    assert isinstance(connector, MSSQLConnector)

    with patch.object(MSSQLConnector, "test_connection", return_value=True), \
         patch.object(MSSQLConnector, "extract_metadata", return_value=[
             {
                 "schema_name": "dbo",
                 "table_name": "account",
                 "object_type": "TABLE",
                 "row_count": 100,
                 "columns": [{"name": "id", "type": "INT", "nullable": False, "primary_key": True}],
                 "primary_keys": ["id"],
                 "foreign_keys": [],
                 "indexes": []
             }
         ]):
        assert connector.test_connection() is True
        metadata = connector.extract_metadata()
        assert len(metadata) == 1
        assert metadata[0]["table_name"] == "account"


def test_mysql_connector_direct():
    params = {
        "host": "localhost",
        "port": 3306,
        "database_name": "test_mysql_db",
        "username": "root",
        "password": "Password123!"
    }
    connector = ConnectorFactory.get_connector(SourceConnectorType.MYSQL, params)
    assert isinstance(connector, MySQLConnector)

    with patch.object(MySQLConnector, "test_connection", return_value=True), \
         patch.object(MySQLConnector, "extract_metadata", return_value=[
             {
                 "schema_name": "main",
                 "table_name": "users",
                 "object_type": "TABLE",
                 "row_count": 50,
                 "columns": [{"name": "id", "type": "INT", "nullable": False, "primary_key": True}],
                 "primary_keys": ["id"],
                 "foreign_keys": [],
                 "indexes": []
             }
         ]):
        assert connector.test_connection() is True
        metadata = connector.extract_metadata()
        assert len(metadata) == 1
        assert metadata[0]["table_name"] == "users"


def test_factory_synapse_and_mariadb_aliases():
    synapse_conn = ConnectorFactory.get_connector("SYNAPSE", {"host": "synapse.windows.net"})
    assert isinstance(synapse_conn, MSSQLConnector)

    mariadb_conn = ConnectorFactory.get_connector("MARIADB", {"host": "localhost"})
    assert isinstance(mariadb_conn, MySQLConnector)


def test_api_mssql_and_mysql_end_to_end():
    # 1. Create Test Project
    test_code = f"CONN_{uuid.uuid4().hex[:8]}"
    project_resp = client.post("/api/v1/projects", json={
        "name": f"DB Connectors Project {test_code}",
        "code": test_code,
        "description": "Integration testing for MSSQL and MySQL connectors"
    })
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    # 2. Add MSSQL Source Connection
    mssql_payload = {
        "name": "Production SQL Server",
        "connector_type": "MSSQL",
        "host": "sqlserver.internal",
        "port": 1433,
        "database_name": "EnterpriseDB",
        "username": "sa",
        "password": "StrongPassword123!"
    }
    mssql_resp = client.post(f"/api/v1/projects/{project_id}/source-connections", json=mssql_payload)
    assert mssql_resp.status_code == 201
    mssql_conn_id = mssql_resp.json()["id"]

    with patch.object(MSSQLConnector, "test_connection", return_value=True), \
         patch.object(MSSQLConnector, "extract_metadata", return_value=[
             {
                 "schema_name": "dbo",
                 "table_name": "account",
                 "object_type": "TABLE",
                 "row_count": 100,
                 "columns": [{"name": "id", "type": "INT", "nullable": False, "primary_key": True}],
                 "primary_keys": ["id"],
                 "foreign_keys": [],
                 "indexes": []
             }
         ]):
        # Test MSSQL Connection
        test_mssql_resp = client.post(f"/api/v1/projects/{project_id}/source-connections/{mssql_conn_id}/test")
        assert test_mssql_resp.status_code == 200
        assert test_mssql_resp.json()["status"] == "SUCCESS"

        # Discover MSSQL Metadata
        disc_mssql_resp = client.post(f"/api/v1/projects/{project_id}/metadata/discover?connection_id={mssql_conn_id}")
        assert disc_mssql_resp.status_code == 200
        mssql_catalogs = disc_mssql_resp.json()
        assert len(mssql_catalogs) > 0

    # 3. Add MySQL Source Connection
    mysql_payload = {
        "name": "Production MySQL DB",
        "connector_type": "MYSQL",
        "host": "mysql.internal",
        "port": 3306,
        "database_name": "app_db",
        "username": "app_user",
        "password": "AppPassword123!"
    }
    mysql_resp = client.post(f"/api/v1/projects/{project_id}/source-connections", json=mysql_payload)
    assert mysql_resp.status_code == 201
    mysql_conn_id = mysql_resp.json()["id"]

    with patch.object(MySQLConnector, "test_connection", return_value=True), \
         patch.object(MySQLConnector, "extract_metadata", return_value=[
             {
                 "schema_name": "main",
                 "table_name": "users",
                 "object_type": "TABLE",
                 "row_count": 50,
                 "columns": [{"name": "id", "type": "INT", "nullable": False, "primary_key": True}],
                 "primary_keys": ["id"],
                 "foreign_keys": [],
                 "indexes": []
             }
         ]):
        # Test MySQL Connection
        test_mysql_resp = client.post(f"/api/v1/projects/{project_id}/source-connections/{mysql_conn_id}/test")
        assert test_mysql_resp.status_code == 200
        assert test_mysql_resp.json()["status"] == "SUCCESS"

        # Discover MySQL Metadata
        disc_mysql_resp = client.post(f"/api/v1/projects/{project_id}/metadata/discover?connection_id={mysql_conn_id}")
        assert disc_mysql_resp.status_code == 200
        mysql_catalogs = disc_mysql_resp.json()
        assert len(mysql_catalogs) > 0


def test_graph_config_with_database_name_and_test_connection():
    # 1. Create Test Project
    test_code = f"GRAPH_{uuid.uuid4().hex[:8]}"
    project_resp = client.post("/api/v1/projects", json={
        "name": f"Graph DB Project {test_code}",
        "code": test_code,
        "description": "Integration testing for target graph database configuration"
    })
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    # 2. Add Target Graph Config with database_name
    graph_payload = {
        "name": "Mars Local Neo4j",
        "target_type": "NEO4J",
        "host": "neo4j://127.0.0.1",
        "port": 7687,
        "database_name": "mars_graph_db",
        "username": "neo4j",
        "password": "Password123!"
    }
    graph_resp = client.post(f"/api/v1/projects/{project_id}/graph-configs", json=graph_payload)
    assert graph_resp.status_code == 201
    graph_data = graph_resp.json()
    assert graph_data["name"] == "Mars Local Neo4j"
    assert graph_data["database_name"] == "mars_graph_db"
    assert graph_data["target_type"] == "NEO4J"

    # 3. Get Graph Configs list
    get_resp = client.get(f"/api/v1/projects/{project_id}/graph-configs")
    assert get_resp.status_code == 200
    configs = get_resp.json()
    assert len(configs) >= 1
    assert configs[-1]["database_name"] == "mars_graph_db"

    # 4. Test Target Graph Connection endpoint
    test_graph_payload = {
        "host": "127.0.0.1",
        "port": 7687,
        "target_type": "NEO4J",
        "database_name": "mars_graph_db",
        "username": "neo4j"
    }
    test_resp = client.post(f"/api/v1/projects/{project_id}/graph/test-connection", json=test_graph_payload)
    assert test_resp.status_code == 200
    test_data = test_resp.json()
    assert test_data["status"] in ["ONLINE", "OFFLINE"]
    assert test_data["database_name"] == "mars_graph_db"


def test_source_connection_test_draft():
    test_code = f"DRAFT_{uuid.uuid4().hex[:8]}"
    project_resp = client.post("/api/v1/projects", json={
        "name": f"Draft Test Project {test_code}",
        "code": test_code,
        "description": "Testing source connection draft test connection"
    })
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    draft_payload = {
        "name": "Draft Connection",
        "connector_type": "MSSQL",
        "host": "localhost",
        "port": 1433,
        "database_name": "TestDraftDB",
        "username": "sa",
        "password": "Password123!"
    }
    with patch.object(MSSQLConnector, "test_connection", return_value=True):
        resp = client.post(f"/api/v1/projects/{project_id}/source-connections/test-draft", json=draft_payload)
        assert resp.status_code == 200
        assert resp.json()["status"] == "SUCCESS"


def test_update_graph_config_and_source_connection():
    test_code = f"UPD_{uuid.uuid4().hex[:8]}"
    project_resp = client.post("/api/v1/projects", json={
        "name": f"Update Test Project {test_code}",
        "code": test_code,
        "description": "Testing graph config and source connection update"
    })
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    # 1. Create and update Target Graph DB config
    initial_graph = {
        "name": "Initial Graph",
        "target_type": "NEO4J",
        "host": "127.0.0.1",
        "port": 7687,
        "database_name": "db1",
        "username": "neo4j",
        "password": "pwd"
    }
    post_g = client.post(f"/api/v1/projects/{project_id}/graph-configs", json=initial_graph)
    assert post_g.status_code == 201

    updated_graph = {
        "name": "Updated Memgraph Cluster",
        "target_type": "MEMGRAPH",
        "host": "memgraph.internal",
        "port": 7687,
        "database_name": "memgraph_db",
        "username": "memgraph",
        "password": "newpwd"
    }
    put_g = client.put(f"/api/v1/projects/{project_id}/graph-configs", json=updated_graph)
    assert put_g.status_code == 200
    assert put_g.json()["name"] == "Updated Memgraph Cluster"
    assert put_g.json()["target_type"] == "MEMGRAPH"

    # 2. Create and update Source Connection
    initial_conn = {
        "name": "Source Alpha",
        "connector_type": "MYSQL",
        "host": "localhost",
        "port": 3306,
        "database_name": "old_db",
        "username": "root"
    }
    create_c = client.post(f"/api/v1/projects/{project_id}/source-connections", json=initial_conn)
    assert create_c.status_code == 201
    conn_id = create_c.json()["id"]

    update_c = client.put(f"/api/v1/projects/{project_id}/source-connections/{conn_id}", json={
        "name": "Source Alpha Updated",
        "connector_type": "POSTGRESQL",
        "host": "pg.internal",
        "port": 5432,
        "database_name": "new_db",
        "username": "pg_user"
    })
    assert update_c.status_code == 200
    assert update_c.json()["name"] == "Source Alpha Updated"
    assert update_c.json()["connector_type"] == "POSTGRESQL"

    # Delete connection
    del_c = client.delete(f"/api/v1/projects/{project_id}/source-connections/{conn_id}")
    assert del_c.status_code == 204


