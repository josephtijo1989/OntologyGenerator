import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000999"


class TestProjectsNegativeScenarios:
    """Negative test cases for Project API endpoints."""

    def test_get_non_existent_project(self):
        response = client.get(f"/api/v1/projects/{NON_EXISTENT_UUID}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_non_existent_project(self):
        response = client.delete(f"/api/v1/projects/{NON_EXISTENT_UUID}")
        assert response.status_code == 404

    def test_create_project_missing_required_fields(self):
        # Missing 'code' and 'name'
        response = client.post("/api/v1/projects", json={})
        assert response.status_code == 422

    def test_create_project_duplicate_code(self):
        test_code = f"DUP_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": f"Project 1 {test_code}",
            "code": test_code,
            "description": "Original project"
        }
        res1 = client.post("/api/v1/projects", json=payload)
        assert res1.status_code == 201

        # Attempt to create project with same 'code'
        res2 = client.post("/api/v1/projects", json=payload)
        assert res2.status_code in (400, 409)
        assert "already exists" in res2.json()["detail"].lower()

    def test_clone_non_existent_project(self):
        response = client.post(f"/api/v1/projects/{NON_EXISTENT_UUID}/clone", json={
            "new_name": "Cloned Project",
            "new_code": f"CLONE_{uuid.uuid4().hex[:6]}"
        })
        assert response.status_code in (400, 404)


class TestConnectorsNegativeScenarios:
    """Negative test cases for Database Connectors and Graph Configs."""

    @pytest.fixture
    def active_project_id(self):
        test_code = f"CONN_NEG_{uuid.uuid4().hex[:6]}"
        res = client.post("/api/v1/projects", json={
            "name": "Connector Neg Test",
            "code": test_code
        })
        return res.json()["id"]

    def test_create_connector_missing_required_fields(self, active_project_id):
        # Missing host and database_name
        payload = {"name": "Incomplete Connector"}
        response = client.post(f"/api/v1/projects/{active_project_id}/source-connections", json=payload)
        assert response.status_code == 422

    def test_update_non_existent_connector(self, active_project_id):
        payload = {
            "name": "Updated Non-Existent",
            "connector_type": "MSSQL",
            "host": "localhost",
            "database_name": "DB"
        }
        response = client.put(f"/api/v1/projects/{active_project_id}/source-connections/{NON_EXISTENT_UUID}", json=payload)
        assert response.status_code == 404

    def test_delete_non_existent_connector(self, active_project_id):
        response = client.delete(f"/api/v1/projects/{active_project_id}/source-connections/{NON_EXISTENT_UUID}")
        assert response.status_code == 404

    def test_test_connection_non_existent_id(self, active_project_id):
        response = client.post(f"/api/v1/projects/{active_project_id}/source-connections/{NON_EXISTENT_UUID}/test")
        assert response.status_code in (400, 404)

    def test_get_non_existent_ontology_config(self, active_project_id):
        response = client.get(f"/api/v1/projects/{active_project_id}/ontology-config")
        assert response.status_code == 404


class TestMetadataAndProfilingNegativeScenarios:
    """Negative test cases for Metadata Catalog and Profiling endpoints."""

    @pytest.fixture
    def active_project_id(self):
        test_code = f"META_NEG_{uuid.uuid4().hex[:6]}"
        res = client.post("/api/v1/projects", json={
            "name": "Metadata Neg Test",
            "code": test_code
        })
        return res.json()["id"]

    def test_discover_metadata_non_existent_connection(self, active_project_id):
        response = client.post(f"/api/v1/projects/{active_project_id}/metadata/discover?connection_id={NON_EXISTENT_UUID}")
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_delete_non_existent_metadata_table(self, active_project_id):
        response = client.delete(f"/api/v1/projects/{active_project_id}/metadata/tables/{NON_EXISTENT_UUID}")
        assert response.status_code == 404

    def test_run_profiling_non_existent_connection(self, active_project_id):
        response = client.post(f"/api/v1/projects/{active_project_id}/profiling/run?connection_id={NON_EXISTENT_UUID}")
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_update_pii_non_existent_profiling_id(self, active_project_id):
        response = client.put(f"/api/v1/projects/{active_project_id}/profiling/{NON_EXISTENT_UUID}/pii", json={
            "column_pii_map": {"email": {"pii_tagged": True, "pii_type": "EMAIL"}}
        })
        assert response.status_code == 404


class TestBusinessRulesNegativeScenarios:
    """Negative test cases for Business Rules Engine."""

    @pytest.fixture
    def active_project_id(self):
        test_code = f"RULE_NEG_{uuid.uuid4().hex[:6]}"
        res = client.post("/api/v1/projects", json={
            "name": "Rule Neg Test",
            "code": test_code
        })
        return res.json()["id"]

    def test_create_rule_missing_required_fields(self, active_project_id):
        response = client.post(f"/api/v1/projects/{active_project_id}/rules", json={})
        assert response.status_code == 422

    def test_update_non_existent_rule(self, active_project_id):
        response = client.put(f"/api/v1/projects/{active_project_id}/rules/{NON_EXISTENT_UUID}", json={
            "name": "Non Existent Rule Update"
        })
        assert response.status_code in (400, 404)

    def test_delete_non_existent_rule(self, active_project_id):
        response = client.delete(f"/api/v1/projects/{active_project_id}/rules/{NON_EXISTENT_UUID}")
        assert response.status_code == 404


class TestOntologyAndParserNegativeScenarios:
    """Negative test cases for OWL Ontology Generator & Stateless Parser."""

    @pytest.fixture
    def active_project_id(self):
        test_code = f"ONTO_NEG_{uuid.uuid4().hex[:6]}"
        res = client.post("/api/v1/projects", json={
            "name": "Ontology Neg Test",
            "code": test_code
        })
        return res.json()["id"]

    def test_update_non_existent_ontology_class(self, active_project_id):
        response = client.put(f"/api/v1/projects/{active_project_id}/ontology/classes/NonExistentClass", json={
            "label": "NonExistentClass",
            "comment": "Does not exist"
        })
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_export_ontology_unsupported_format(self, active_project_id):
        response = client.post(f"/api/v1/projects/{active_project_id}/ontology/export", json={
            "format": "INVALID_YAML"
        })
        assert response.status_code == 400
        assert "unsupported" in response.json()["detail"].lower()

    def test_parse_preview_empty_content(self):
        response = client.post("/api/v1/ontology/parse-preview", json={
            "raw_content": "   \n  "
        })
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_parse_preview_malformed_syntax(self):
        response = client.post("/api/v1/ontology/parse-preview", json={
            "raw_content": "THIS IS INVALID RDF TURTLE SYNTAX @@@ ### !!!",
            "format_hint": "turtle"
        })
        assert response.status_code == 400

    def test_upload_preview_empty_file(self):
        files = {"file": ("empty.ttl", b"", "text/turtle")}
        response = client.post("/api/v1/ontology/upload-preview", files=files)
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


class TestGraphLineageNegativeScenarios:
    """Negative test cases for Knowledge Graph & Sync."""

    @pytest.fixture
    def active_project_id(self):
        test_code = f"GRAPH_NEG_{uuid.uuid4().hex[:6]}"
        res = client.post("/api/v1/projects", json={
            "name": "Graph Neg Test",
            "code": test_code
        })
        return res.json()["id"]

    def test_sync_to_target_graph_without_config(self, active_project_id):
        # Attempt sync when no target graph DB has been configured for the project
        response = client.post(f"/api/v1/projects/{active_project_id}/graph/sync-to-target")
        assert response.status_code == 400
        assert "configured" in response.json()["detail"].lower()
