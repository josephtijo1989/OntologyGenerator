from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.ontology import (
    OntologyModelResponse,
    OntologyExportRequest,
    OntologyClassUpdateRequest,
    OntologyClassCreateRequest,
    OntologyParseViewRequest,
    OntologyParseViewResponse
)
from app.services.ontology_service import OntologyService
from app.ontology.parser import OntologyParser

router = APIRouter(tags=["Semantic Ontology Engine"])


@router.get("/projects/{project_id}/ontology/generate", response_model=OntologyModelResponse)
def generate_ontology(project_id: str, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        return svc.generate_ontology(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/projects/{project_id}/ontology/classes", response_model=OntologyModelResponse, status_code=status.HTTP_201_CREATED)
def create_ontology_class(project_id: str, req: OntologyClassCreateRequest, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        return svc.create_class(project_id, req.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/projects/{project_id}/ontology/classes/{class_name}", response_model=OntologyModelResponse)
def update_ontology_class(project_id: str, class_name: str, req: OntologyClassUpdateRequest, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        return svc.update_class_details(project_id, class_name, req.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/projects/{project_id}/ontology/export")
def export_ontology(project_id: str, req: OntologyExportRequest, db: Session = Depends(get_db)):
    svc = OntologyService(db)
    try:
        exported_str = svc.export_ontology(project_id, format_str=req.format)
        return PlainTextResponse(content=exported_str, media_type="text/plain")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/ontology/parse-preview", response_model=OntologyParseViewResponse)
def parse_ontology_preview(req: OntologyParseViewRequest):
    """
    Stateless parser endpoint: Ingests raw RDF/OWL string (Turtle, OWL/XML, JSON-LD, N-Triples),
    extracts ontology classes, datatype properties, object relations, and graph structure in-memory
    WITHOUT saving or persisting to the database.
    """
    if not req.raw_content or not req.raw_content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ontology raw content cannot be empty.")
    
    parser = OntologyParser()
    try:
        return parser.parse_ontology(req.raw_content, filename=req.filename, format_hint=req.format_hint)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/ontology/upload-preview", response_model=OntologyParseViewResponse)
async def upload_ontology_preview(file: UploadFile = File(...), format_hint: Optional[str] = Form("auto")):
    """
    Stateless upload endpoint: Accepts multi-format ontology file uploads,
    parses in-memory, and returns the interactive schema/graph representation WITHOUT database writes.
    """
    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="replace")
        if not content.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded ontology file is empty.")
        
        parser = OntologyParser()
        return parser.parse_ontology(content, filename=file.filename, format_hint=format_hint)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to parse ontology file: {str(e)}")
