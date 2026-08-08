from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.models.domain import BusinessRuleType
from app.schemas.rule import BusinessRuleCreate, BusinessRuleUpdate, BusinessRuleResponse
from app.services.rules_service import BusinessRuleService

router = APIRouter(prefix="/projects/{project_id}/rules", tags=["Business Rules Engine"])


@router.get("", response_model=List[BusinessRuleResponse])
def get_rules(project_id: str, rule_type: Optional[BusinessRuleType] = None, db: Session = Depends(get_db)):
    svc = BusinessRuleService(db)
    return svc.get_rules(project_id, rule_type)


@router.post("", response_model=BusinessRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(project_id: str, rule_in: BusinessRuleCreate, db: Session = Depends(get_db)):
    svc = BusinessRuleService(db)
    return svc.create_rule(project_id, rule_in)


@router.put("/{rule_id}", response_model=BusinessRuleResponse)
def update_rule(project_id: str, rule_id: str, rule_in: BusinessRuleUpdate, db: Session = Depends(get_db)):
    svc = BusinessRuleService(db)
    try:
        return svc.update_rule(rule_id, rule_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(project_id: str, rule_id: str, db: Session = Depends(get_db)):
    svc = BusinessRuleService(db)
    success = svc.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
