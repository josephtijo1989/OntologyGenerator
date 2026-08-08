from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Immutable Audit Trail"])


@router.get("")
def search_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db)
):
    svc = AuditService(db)
    return svc.search_logs(user_id=user_id, action=action, entity_type=entity_type, skip=skip, limit=limit)
