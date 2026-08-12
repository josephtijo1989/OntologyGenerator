from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class OntologyConfigCreate(BaseModel):
    ontology_name: str
    base_iri: str = "http://enterprise.org/ontology#"
    prefix: str = "eonto"
    version: str = "1.0.0"
    description: Optional[str] = None


class OntologyConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    ontology_name: str
    base_iri: str
    prefix: str
    version: str
    description: Optional[str] = None
    created_at: datetime


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
    relationship_name: Optional[str] = None
    inverse_property: Optional[str] = None
    is_inverse: Optional[bool] = False
    is_primary_key: Optional[bool] = False
    table_name: Optional[str] = None
    comment: Optional[str] = None


class OntologyViewerStats(BaseModel):
    classes_count: int = 0
    datatype_properties_count: int = 0
    object_properties_count: int = 0
    total_triples_count: int = 0


class OntologyModelResponse(BaseModel):
    ontology_name: str
    base_iri: str
    classes: List[OntologyClassSchema]
    properties: List[OntologyPropertySchema]
    stats: Optional[OntologyViewerStats] = None
    graph: Optional[Dict[str, Any]] = None


class OntologyExportRequest(BaseModel):
    format: str  # OWL/XML, Turtle, RDF/XML, JSON-LD, RDFS, XML


class OntologyClassUpdateRequest(BaseModel):
    label: Optional[str] = None
    comment: Optional[str] = None
    subclass_of: Optional[Union[List[str], str]] = None
    domain_type: Optional[str] = None
    properties: Optional[List[Dict[str, Any]]] = None


class OntologyClassCreateRequest(BaseModel):
    class_name: str
    subclass_of: Optional[Union[List[str], str]] = "owl:Thing"
    domain_type: Optional[str] = "Dimension"
    comment: Optional[str] = None
    properties: Optional[List[Dict[str, Any]]] = None


class OntologyParseViewRequest(BaseModel):
    raw_content: Optional[str] = None
    filename: Optional[str] = None
    format_hint: Optional[str] = "auto"



class OntologyParseViewResponse(BaseModel):
    status: str = "SUCCESS"
    ontology_name: str
    base_iri: str
    detected_format: str
    classes: List[OntologyClassSchema]
    properties: List[OntologyPropertySchema]
    turtle_preview: Optional[str] = None
    stats: OntologyViewerStats
    graph: Optional[Dict[str, Any]] = None

