from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.repositories.audit_repository import AuditRepository


class AuditService:
    def __init__(self, db: Session):
        self.audit_repo = AuditRepository(db)

    def log_event(
        self,
        action: str,
        entity_type: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        client_ip: Optional[str] = None,
        entity_id: Optional[str] = None,
        previous_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
        outcome: str = "SUCCESS",
        error_message: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            username=username,
            client_ip=client_ip,
            entity_id=entity_id,
            previous_value_json=previous_value,
            new_value_json=new_value,
            duration_ms=duration_ms,
            outcome=outcome,
            error_message=error_message
        )
        return self.audit_repo.create(log_entry)

    def search_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        return self.audit_repo.search_audit_logs(
            user_id=user_id, action=action, entity_type=entity_type, skip=skip, limit=limit
        )
