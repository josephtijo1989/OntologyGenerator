from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/projects/{project_id}/dashboard", tags=["Executive Dashboard"])


@router.get("/metrics", response_model=Dict[str, Any])
def get_dashboard_metrics(project_id: str, db: Session = Depends(get_db)):
    svc = DashboardService(db)
    try:
        return svc.get_dashboard_metrics(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
