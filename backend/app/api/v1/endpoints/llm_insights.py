from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.configuration.database import get_db
from app.schemas.llm_insights import (
    LLMInsightRequest, LLMInsightResponse,
    ApprovedCypherCreate, ApprovedCypherUpdate, ApprovedCypherResponse
)
from app.services.llm_insight_service import LLMInsightService

router = APIRouter(prefix="/projects/{project_id}/llm", tags=["AI Knowledge Graph Insights & LLM Analytics"])


@router.post("/insights", response_model=LLMInsightResponse)
def generate_insights(project_id: str, req: LLMInsightRequest, db: Session = Depends(get_db)):
    svc = LLMInsightService(db)
    try:
        return svc.generate_insights(project_id, req)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/approved-cyphers", response_model=ApprovedCypherResponse, status_code=status.HTTP_201_CREATED)
def save_approved_cypher(project_id: str, req: ApprovedCypherCreate, db: Session = Depends(get_db)):
    svc = LLMInsightService(db)
    try:
        return svc.save_approved_cypher(project_id, req)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/approved-cyphers", response_model=List[ApprovedCypherResponse])
def get_approved_cyphers(project_id: str, db: Session = Depends(get_db)):
    svc = LLMInsightService(db)
    return svc.get_approved_cyphers(project_id)


@router.put("/approved-cyphers/{cypher_id}", response_model=ApprovedCypherResponse)
def update_approved_cypher(project_id: str, cypher_id: str, req: ApprovedCypherUpdate, db: Session = Depends(get_db)):
    svc = LLMInsightService(db)
    try:
        return svc.update_approved_cypher(cypher_id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/approved-cyphers/{cypher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_approved_cypher(project_id: str, cypher_id: str, db: Session = Depends(get_db)):
    svc = LLMInsightService(db)
    success = svc.delete_approved_cypher(cypher_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved Cypher Query not found")
