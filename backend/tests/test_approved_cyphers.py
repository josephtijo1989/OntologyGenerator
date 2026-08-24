import uuid
import pytest
from app.configuration.database import SessionLocal, engine, Base
from app.models.domain import Project, ApprovedCypherQuery
from app.services.llm_insight_service import LLMInsightService
from app.schemas.llm_insights import ApprovedCypherCreate, ApprovedCypherUpdate, LLMInsightRequest


def test_approved_cypher_crud_and_similarity():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        test_code = f"APP_{uuid.uuid4().hex[:8]}"
        project = Project(name="Test Approved Project", code=test_code, owner_id="user123")
        db.add(project)
        db.commit()
        db.refresh(project)

        svc = LLMInsightService(db)

        # 1. Save Approved Cypher Query
        create_req = ApprovedCypherCreate(
            question_prompt="List all vendor name.",
            approved_cypher="MATCH (v:Vendor) RETURN v.vendorName AS vendorName LIMIT 15;"
        )
        saved = svc.save_approved_cypher(project.id, create_req)
        assert saved.id is not None
        assert saved.question_prompt == "List all vendor name."
        assert saved.usage_count == 1

        # 2. Get Approved Cypher Queries
        queries = svc.get_approved_cyphers(project.id)
        assert len(queries) == 1
        assert queries[0].approved_cypher == "MATCH (v:Vendor) RETURN v.vendorName AS vendorName LIMIT 15;"

        # 3. Test Few-Shot Similarity Matching with Similar Question
        res = svc.generate_insights(project.id, LLMInsightRequest(user_prompt="Show all vendor names"))
        assert "Approved Few-Shot Knowledge Repository" in res.generated_cypher_query
        assert "MATCH (v:Vendor)" in res.generated_cypher_query

        # 4. Update Approved Cypher Query
        update_req = ApprovedCypherUpdate(
            question_prompt="List all vendor names clearly",
            approved_cypher="MATCH (v:Vendor) RETURN v.vendorName, v.complianceStatus LIMIT 15;"
        )
        updated = svc.update_approved_cypher(saved.id, update_req)
        assert updated.question_prompt == "List all vendor names clearly"
        assert "v.complianceStatus" in updated.approved_cypher

        # 5. Delete Approved Cypher Query
        success = svc.delete_approved_cypher(saved.id)
        assert success is True

        queries_after = svc.get_approved_cyphers(project.id)
        assert len(queries_after) == 0

    finally:
        db.close()
