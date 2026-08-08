from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import BusinessRule, BusinessRuleType
from app.repositories.base import BaseRepository


class BusinessRuleRepository(BaseRepository[BusinessRule]):
    def __init__(self, db: Session):
        super().__init__(BusinessRule, db)

    def get_by_project(self, project_id: str, rule_type: Optional[BusinessRuleType] = None) -> List[BusinessRule]:
        query = self.db.query(BusinessRule).filter(BusinessRule.project_id == project_id)
        if rule_type:
            query = query.filter(BusinessRule.rule_type == rule_type)
        return query.all()
