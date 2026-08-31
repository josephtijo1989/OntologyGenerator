import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_llm_insights_generation():
    # 1. Create a Project
    test_code = f"LLM_{uuid.uuid4().hex[:8]}"
    proj_resp = client.post("/api/v1/projects", json={
        "name": "LLM Test Project",
        "code": test_code,
        "description": "Project for testing AI Insights tab"
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # 2. Test LLM Insights Generation
    res = client.post(f"/api/v1/projects/{project_id}/llm/insights", json={
        "user_prompt": "What are the vendor contract risks across our active invoices?",
        "model_name": "gemini-1.5-pro",
        "temperature": 0.2
    })
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == project_id
    assert "vendor" in data["executive_summary"].lower() or "synthesized" in data["executive_summary"].lower()
    assert len(data["insights"]) > 0

    # Clean up project
    del_res = client.delete(f"/api/v1/projects/{project_id}")
    assert del_res.status_code in [200, 204]


def test_llm_insights_comparison_where_conditions():
    test_code = f"LLM_CMP_{uuid.uuid4().hex[:8]}"
    proj_resp = client.post("/api/v1/projects", json={
        "name": "LLM Comparison Test Project",
        "code": test_code,
        "description": "Testing WHERE clause comparison generation"
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    prompt = (
        "Find all such invoices where,\n"
        "Invoice Discount Offer > 0\n"
        "AND Payment Date > Discount Deadline Date\n"
        "AND Available Capital > Discounted Amount"
    )

    res = client.post(f"/api/v1/projects/{project_id}/llm/insights", json={
        "user_prompt": prompt,
        "model_name": "gemini-1.5-pro"
    })
    assert res.status_code == 200
    data = res.json()
    cypher = data["generated_cypher_query"]
    assert "WHERE" in cypher.upper()
    assert "discountOffer > 0" in cypher or "invoiceDiscountOffer > 0" in cypher
    assert "paymentDate >" in cypher
    assert "availableCapital >" in cypher

    client.delete(f"/api/v1/projects/{project_id}")


def test_llm_insights_raw_cypher_passthrough():
    test_code = f"LLM_RAW_{uuid.uuid4().hex[:8]}"
    proj_resp = client.post("/api/v1/projects", json={
        "name": "LLM Raw Cypher Test Project",
        "code": test_code,
        "description": "Testing raw Cypher pass-through"
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    raw_cypher = "MATCH (i:Invoice) WHERE i.discountOffer > 0 RETURN i LIMIT 5;"

    res = client.post(f"/api/v1/projects/{project_id}/llm/insights", json={
        "user_prompt": raw_cypher,
        "model_name": "gemini-1.5-pro"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["generated_cypher_query"].strip() == raw_cypher.strip()

    client.delete(f"/api/v1/projects/{project_id}")


def test_llm_insights_multi_entity_where_conditions():
    test_code = f"LLM_MULTI_{uuid.uuid4().hex[:8]}"
    proj_resp = client.post("/api/v1/projects", json={
        "name": "LLM Multi Entity Test Project",
        "code": test_code,
        "description": "Testing multi-entity Cypher WHERE clause generation"
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    prompt = (
        "Find vendor contracts and invoices where contract multipleJurisdictionIndicator = true "
        "and invoice totalAmount > 0 and invoice dueDate is approaching"
    )

    res = client.post(f"/api/v1/projects/{project_id}/llm/insights", json={
        "user_prompt": prompt,
        "model_name": "gemini-1.5-pro"
    })
    assert res.status_code == 200
    data = res.json()
    cypher = data["generated_cypher_query"]
    print("\n--- GENERATED CYPHER ---\n", cypher, "\n--- END CYPHER ---\n")
    assert ":Vendor" in cypher or "(v:Vendor)" in cypher
    assert ":Contract" in cypher
    assert ":Invoice" in cypher
    assert "WHERE" in cypher.upper()
    assert "totalamount > 0" in cypher.lower() or "multiplejurisdictionindicator = true" in cypher.lower() or "duedate is not null" in cypher.lower()

    client.delete(f"/api/v1/projects/{project_id}")


def test_llm_insights_ontology_concepts_extraction():
    test_code = f"LLM_ONTO_{uuid.uuid4().hex[:8]}"
    proj_resp = client.post("/api/v1/projects", json={
        "name": "LLM Ontology Concepts Test Project",
        "code": test_code,
        "description": "Testing W3C OWL Ontology Concepts extraction in executive summary"
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    res = client.post(f"/api/v1/projects/{project_id}/llm/insights", json={
        "user_prompt": "MATCH (i:Invoice)-[r:APPROVED_BY]->(u:User) RETURN i.invoiceNumber, u.userName",
        "model_name": "gemini-1.5-pro"
    })
    assert res.status_code == 200
    data = res.json()
    exec_summary = data["executive_summary"]
    
    assert "W3C OWL Ontology Concepts & Attributes Used" in exec_summary
    assert "`:Invoice`" in exec_summary
    assert "`:User`" in exec_summary
    assert "`:APPROVED_BY`" in exec_summary
    assert "`invoiceNumber`" in exec_summary
    assert "`userName`" in exec_summary

    client.delete(f"/api/v1/projects/{project_id}")




