from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.metadata import ProfilingResultResponse, PIIUpdateRequest
from app.services.profiling_service import ProfilingService

router = APIRouter(prefix="/projects/{project_id}/profiling", tags=["Data Profiling Engine"])


@router.post("/run", response_model=List[ProfilingResultResponse])
def run_profiling(project_id: str, connection_id: str = Query(...), db: Session = Depends(get_db)):
    svc = ProfilingService(db)
    try:
        return svc.profile_project_tables(project_id, connection_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[ProfilingResultResponse])
def get_profiling_results(project_id: str, db: Session = Depends(get_db)):
    svc = ProfilingService(db)
    return svc.get_profiling_results(project_id)


@router.put("/{profiling_id}/pii", response_model=ProfilingResultResponse)
def update_pii_classifications(project_id: str, profiling_id: str, req: PIIUpdateRequest, db: Session = Depends(get_db)):
    svc = ProfilingService(db)
    try:
        col_map = {k: v.model_dump() for k, v in req.column_pii_map.items()}
        return svc.update_pii_classifications(profiling_id, col_map)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
