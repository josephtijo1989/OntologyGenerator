from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.metadata import MetadataTableResponse
from app.services.metadata_service import MetadataService

router = APIRouter(prefix="/projects/{project_id}/metadata", tags=["Metadata Catalog"])


@router.post("/discover", response_model=List[MetadataTableResponse])
def discover_metadata(project_id: str, connection_id: str = Query(...), db: Session = Depends(get_db)):
    svc = MetadataService(db)
    try:
        svc.discover_and_catalog(project_id, connection_id)
        return svc.get_project_metadata(project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[MetadataTableResponse])
def get_metadata_catalog(project_id: str, db: Session = Depends(get_db)):
    svc = MetadataService(db)
    return svc.get_project_metadata(project_id)


@router.delete("/tables/{table_id}")
def delete_metadata_table(project_id: str, table_id: str, db: Session = Depends(get_db)):
    svc = MetadataService(db)
    try:
        svc.delete_metadata_table(project_id, table_id)
        return {"status": "success", "message": f"Metadata table {table_id} deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("", status_code=status.HTTP_200_OK)
def clear_all_metadata(project_id: str, db: Session = Depends(get_db)):
    svc = MetadataService(db)
    svc.clear_all_metadata(project_id)
    return {"status": "success", "message": "All metadata tables cleared successfully"}
