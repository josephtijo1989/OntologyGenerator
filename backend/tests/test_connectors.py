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
