import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"


def test_projects_crud():
    # 1. Create Project
    payload = {
        "name": "Automated Test Project",
        "code": "AUTO_TEST_PROJ_99",
        "description": "Integration testing project"
    }
    create_resp = client.post("/api/v1/projects", json=payload)
    assert create_resp.status_code in [201, 400]
    
    # 2. Get All Projects
    list_resp = client.get("/api/v1/projects")
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert len(projects) > 0
    project_id = projects[0]["id"]

    # 3. Get Project Dashboard
    dash_resp = client.get(f"/api/v1/projects/{project_id}/dashboard/metrics")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "project_name" in dash_data
    assert dash_data["system_health"] == "HEALTHY"

    # 4. Source Connection CRUD
    conn_payload = {
        "name": "Test MSSQL Connector",
        "connector_type": "MSSQL",
        "host": "localhost",
        "port": 1433,
        "database_name": "TestDB",
        "username": "sa",
        "password": "Password123!"
    }
    conn_resp = client.post(f"/api/v1/projects/{project_id}/source-connections", json=conn_payload)
    assert conn_resp.status_code == 201
    conn_id = conn_resp.json()["id"]

    # 5. Test Connection
    test_conn_resp = client.post(f"/api/v1/projects/{project_id}/source-connections/{conn_id}/test")
    assert test_conn_resp.status_code == 200
    assert test_conn_resp.json()["status"] == "SUCCESS"

    # 6. Metadata Discovery
    disc_resp = client.post(f"/api/v1/projects/{project_id}/metadata/discover?connection_id={conn_id}")
    assert disc_resp.status_code == 200
    catalogs = disc_resp.json()
    assert len(catalogs) > 0

    # 7. Data Profiling
    prof_resp = client.post(f"/api/v1/projects/{project_id}/profiling/run?connection_id={conn_id}")
    assert prof_resp.status_code == 200
    profiles = prof_resp.json()
    assert len(profiles) > 0

    # 8. Graph Generation
    graph_resp = client.get(f"/api/v1/projects/{project_id}/graph/generate")
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()
    assert graph_data["node_count"] > 0

    # 9. Ontology Generation
    onto_resp = client.get(f"/api/v1/projects/{project_id}/ontology/generate")
    assert onto_resp.status_code == 200
    onto_data = onto_resp.json()
    assert len(onto_data["classes"]) > 0

    # 10. Audit Logs
    audit_resp = client.get("/api/v1/audit-logs")
    assert audit_resp.status_code == 200
