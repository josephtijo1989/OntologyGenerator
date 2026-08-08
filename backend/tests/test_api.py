import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"


def test_projects_crud_and_ontology_relationships():
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

    # 6. Metadata Discovery (Extracts tables, PKs, and FKs)
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

    # 9. Ontology Generation with PK Articulation & Inverse Relationships
    onto_resp = client.get(f"/api/v1/projects/{project_id}/ontology/generate")
    assert onto_resp.status_code == 200
    onto_data = onto_resp.json()
    assert len(onto_data["classes"]) > 0

    # Verify Primary Keys are articulated in classes and properties
    classes_with_pks = [c for c in onto_data["classes"] if c.get("primary_keys") and len(c["primary_keys"]) > 0]
    assert len(classes_with_pks) > 0, "Expected at least one class to articulate primary keys"
    
    pk_properties = [p for p in onto_data["properties"] if p.get("is_primary_key") is True]
    assert len(pk_properties) > 0, "Expected at least one property with is_primary_key=True"

    # Verify FK generates forward and inverse ObjectProperty relationships
    obj_props = [p for p in onto_data["properties"] if p.get("property_type") == "ObjectProperty"]
    assert len(obj_props) > 0, "Expected ObjectProperty relationships generated from foreign keys"

    # Verify inverse relationship exists
    inv_props = [p for p in obj_props if p.get("is_inverse") is True or p.get("inverse_property")]
    assert len(inv_props) > 0, "Expected inverse relationship properties generated from foreign keys"

    # 10. Update Ontology Class Details with Custom Relationship and PK
    target_class = onto_data["classes"][0]
    class_label = target_class["label"]
    update_payload = {
        "label": class_label,
        "subclass_of": "eonto:CoreMasterData",
        "domain_type": "Dimension",
        "comment": "Updated ontology class with custom inverse relationship",
        "properties": [
            {
                "label": "hasCustomEmail",
                "relationship_name": "hasCustomEmail",
                "property_type": "DatatypeProperty",
                "range": "xsd:string",
                "is_primary_key": False,
                "comment": "Customer email"
            },
            {
                "label": "hasCustomKeyId",
                "relationship_name": "hasCustomKeyId",
                "property_type": "DatatypeProperty",
                "range": "xsd:integer",
                "is_primary_key": True,
                "comment": "[PRIMARY KEY] Custom primary key"
            },
            {
                "label": "relatesToOrdersCustom",
                "relationship_name": "relatesToOrdersCustom",
                "property_type": "ObjectProperty",
                "range": "Orders",
                "parent_class": class_label,
                "target_class": "Orders",
                "inverse_property": "hasCustomerListCustom",
                "is_inverse": False,
                "is_primary_key": False,
                "comment": "Custom object property"
            }
        ]
    }
    update_resp = client.put(f"/api/v1/projects/{project_id}/ontology/classes/{class_label}", json=update_payload)
    assert update_resp.status_code == 200
    updated_onto = update_resp.json()
    
    # Check that custom properties and inverse relations were updated
    matching_c = next((c for c in updated_onto["classes"] if c["label"] == class_label), None)
    assert matching_c is not None
    assert matching_c["subclass_of"] == ["eonto:CoreMasterData"]

    # 11. Test Export Turtle (.ttl) containing owl:inverseOf and owl:hasKey
    export_ttl_resp = client.post(f"/api/v1/projects/{project_id}/ontology/export", json={"format": "Turtle"})
    assert export_ttl_resp.status_code == 200
    ttl_content = export_ttl_resp.text
    assert "owl:Class" in ttl_content or "a owl:Class" in ttl_content
    assert "owl:inverseOf" in ttl_content
    assert "owl:hasKey" in ttl_content or "hasPrimaryKey" in ttl_content

    # 12. Test Export OWL/XML (.owl)
    export_owl_resp = client.post(f"/api/v1/projects/{project_id}/ontology/export", json={"format": "OWL/XML"})
    assert export_owl_resp.status_code == 200
    assert len(export_owl_resp.text) > 0

    # 13. Audit Logs
    audit_resp = client.get("/api/v1/audit-logs")
    assert audit_resp.status_code == 200
