from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.models.domain import BusinessRuleType


class BusinessRuleCreate(BaseModel):
    name: str
    rule_type: Optional[BusinessRuleType] = BusinessRuleType.VALIDATION
    rule_definition: Optional[str] = None
    target_entity: Optional[str] = None
    target_attribute: Optional[str] = None
    definition_json: Optional[Dict[str, Any]] = None
    is_active: bool = True


class BusinessRuleUpdate(BaseModel):
    name: Optional[str] = None
    rule_type: Optional[BusinessRuleType] = None
    rule_definition: Optional[str] = None
    target_entity: Optional[str] = None
    target_attribute: Optional[str] = None
    definition_json: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class BusinessRuleResponse(BaseModel):
    id: str
    project_id: str
    name: str
    rule_type: Optional[BusinessRuleType] = BusinessRuleType.VALIDATION
    rule_definition: Optional[str] = None
    target_entity: Optional[str] = None
    target_attribute: Optional[str] = None
    definition_json: Optional[Dict[str, Any]] = None
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
