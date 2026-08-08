from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.ontology import OntologyModelResponse, OntologyExportRequest, OntologyClassUpdateRequest
from app.services.ontology_service import OntologyService

router = APIRouter(prefix="/projects/{project_id}/ontology", tags=["Semantic Ontology Engine"])


@router.get("/generate", response_model=OntologyModelResponse)
def generate_ontology(project_id: str, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        return svc.generate_ontology(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/classes/{class_name}", response_model=OntologyModelResponse)
def update_ontology_class(project_id: str, class_name: str, req: OntologyClassUpdateRequest, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        return svc.update_class_details(project_id, class_name, req.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/export")
def export_ontology(project_id: str, req: OntologyExportRequest, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        exported_str = svc.export_ontology(project_id, format_str=req.format)
        return PlainTextResponse(content=exported_str, media_type="text/plain")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
