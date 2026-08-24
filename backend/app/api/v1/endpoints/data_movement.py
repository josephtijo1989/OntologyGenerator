from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.configuration.database import get_db
from app.schemas.data_movement import (
    DataMovementExecutionRequest, DataMovementJobResponse, DataMovementMappingResponse
)
from app.services.data_movement_service import DataMovementService

router = APIRouter(prefix="/projects/{project_id}/data-movement", tags=["Data Movement & Migration Engine"])


@router.get("/mapping", response_model=DataMovementMappingResponse)
def get_pipeline_mapping(project_id: str, db: Session = Depends(get_db)):
    svc = DataMovementService(db)
    try:
        return svc.get_data_movement_mappings(project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/execute", response_model=DataMovementJobResponse)
def execute_data_movement(project_id: str, req: DataMovementExecutionRequest, db: Session = Depends(get_db)):
    svc = DataMovementService(db)
    try:
        return svc.execute_data_movement(project_id, req)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/history", response_model=List[DataMovementJobResponse])
def get_job_history(project_id: str, db: Session = Depends(get_db)):
    svc = DataMovementService(db)
    try:
        return svc.get_job_history(project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/history/{job_id}")
def delete_job_history(project_id: str, job_id: str, db: Session = Depends(get_db)):
    svc = DataMovementService(db)
    success = svc.delete_job_history(project_id, job_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job execution record not found.")
    return {"status": "SUCCESS", "message": "Job history log deleted successfully."}
