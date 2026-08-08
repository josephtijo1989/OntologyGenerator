from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
from datetime import datetime


class OntologyConfigCreate(BaseModel):
    ontology_name: str
    base_iri: str = "http://enterprise.org/ontology#"
    prefix: str = "eonto"
    version: str = "1.0.0"
    description: Optional[str] = None


class OntologyConfigResponse(BaseModel):
    id: str
    project_id: str
    ontology_name: str
    base_iri: str
    prefix: str
    version: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OntologyClassSchema(BaseModel):
    id: Optional[str] = None
    iri: str
    label: str
    mapped_table_name: Optional[str] = None
    comment: Optional[str] = None
    subclass_of: Optional[List[str]] = None
    primary_keys: Optional[List[str]] = None
    business_rules: Optional[List[Dict[str, Any]]] = None
    annotations: Dict[str, Any] = {}


class OntologyPropertySchema(BaseModel):
    id: Optional[str] = None
    iri: str
    label: str
    mapped_column_name: Optional[str] = None
    property_type: str  # DatatypeProperty or ObjectProperty
    domain: Optional[str] = None
    range: Optional[str] = None
    parent_class: Optional[str] = None
    target_class: Optional[str] = None
    is_primary_key: Optional[bool] = False
    comment: Optional[str] = None


class OntologyModelResponse(BaseModel):
    ontology_name: str
    base_iri: str
    classes: List[OntologyClassSchema]
    properties: List[OntologyPropertySchema]


class OntologyExportRequest(BaseModel):
    format: str  # OWL/XML, Turtle, RDF/XML, JSON-LD, RDFS, XML


class OntologyClassUpdateRequest(BaseModel):
    label: Optional[str] = None
    comment: Optional[str] = None
    subclass_of: Optional[Union[List[str], str]] = None
    domain_type: Optional[str] = None
    properties: Optional[List[Dict[str, Any]]] = None
