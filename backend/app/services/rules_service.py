from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.domain import BusinessRule, BusinessRuleType
from app.repositories.rule_repository import BusinessRuleRepository
from app.schemas.rule import BusinessRuleCreate, BusinessRuleUpdate


class BusinessRuleService:
    def __init__(self, db: Session):
        self.rule_repo = BusinessRuleRepository(db)

    def get_rules(self, project_id: str, rule_type: Optional[BusinessRuleType] = None) -> List[BusinessRule]:
        return self.rule_repo.get_by_project(project_id, rule_type)

    def create_rule(self, project_id: str, rule_in: BusinessRuleCreate) -> BusinessRule:
        rule = BusinessRule(
            project_id=project_id,
            name=rule_in.name,
            rule_type=rule_in.rule_type or BusinessRuleType.VALIDATION,
            rule_definition=rule_in.rule_definition,
            target_entity=rule_in.target_entity,
            target_attribute=rule_in.target_attribute,
            definition_json=rule_in.definition_json or {"description": rule_in.rule_definition, "target_table": rule_in.target_entity, "target_column": rule_in.target_attribute},
            version=1,
            is_active=rule_in.is_active
        )
        return self.rule_repo.create(rule)

    def update_rule(self, rule_id: str, rule_in: BusinessRuleUpdate) -> BusinessRule:
        rule = self.rule_repo.get_by_id(rule_id)
        if not rule:
            raise ValueError("Business rule not found")

        update_data = rule_in.model_dump(exclude_unset=True)
        if "definition_json" in update_data:
            update_data["version"] = rule.version + 1

        return self.rule_repo.update(rule, update_data)

    def delete_rule(self, rule_id: str) -> bool:
        return self.rule_repo.delete(rule_id)
