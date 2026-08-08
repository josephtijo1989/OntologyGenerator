from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.metadata import (
    SourceConnectionCreate, SourceConnectionResponse,
    GraphConfigCreate, GraphConfigResponse
)
from app.schemas.ontology import OntologyConfigCreate, OntologyConfigResponse
from app.services.connector_service import ConnectorService

router = APIRouter(prefix="/projects/{project_id}", tags=["Connectors & Configurations"])


@router.post("/source-connections", response_model=SourceConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_source_connection(project_id: str, conn_in: SourceConnectionCreate, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    return svc.create_source_connection(project_id, conn_in)


@router.get("/source-connections", response_model=List[SourceConnectionResponse])
def get_source_connections(project_id: str, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    return svc.get_source_connections(project_id)


@router.put("/source-connections/{connection_id}", response_model=SourceConnectionResponse)
def update_source_connection(project_id: str, connection_id: str, conn_in: SourceConnectionCreate, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    updated = svc.update_source_connection(connection_id, conn_in)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source connection not found")
    return updated


@router.delete("/source-connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source_connection(project_id: str, connection_id: str, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    success = svc.delete_source_connection(connection_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source connection not found")


@router.post("/source-connections/{connection_id}/test")
def test_source_connection(project_id: str, connection_id: str, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    try:
        success = svc.test_source_connection(connection_id)
        return {"connection_id": connection_id, "status": "SUCCESS" if success else "FAILED"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/graph-configs", response_model=GraphConfigResponse, status_code=status.HTTP_201_CREATED)
def create_graph_config(project_id: str, graph_in: GraphConfigCreate, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    return svc.create_graph_config(project_id, graph_in)


@router.get("/graph-configs", response_model=List[GraphConfigResponse])
def get_graph_configs(project_id: str, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    return svc.get_graph_configs(project_id)


@router.post("/ontology-config", response_model=OntologyConfigResponse)
def save_ontology_config(project_id: str, onto_in: OntologyConfigCreate, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    return svc.create_or_update_ontology_config(project_id, onto_in)


@router.get("/ontology-config", response_model=OntologyConfigResponse)
def get_ontology_config(project_id: str, db: Session = Depends(get_db)):
    svc = ConnectorService(db)
    cfg = svc.get_ontology_config(project_id)
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ontology config not set")
    return cfg
