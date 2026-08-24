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
