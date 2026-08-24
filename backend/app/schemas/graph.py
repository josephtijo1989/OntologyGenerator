from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class GraphNodeSchema(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]
    source_table: Optional[str] = None


class GraphEdgeSchema(BaseModel):
    id: str
    source_id: str
    target_id: str
    relationship: str
    properties: Dict[str, Any]


class EnterpriseGraphModel(BaseModel):
    project_id: str
    nodes: List[GraphNodeSchema]
    edges: List[GraphEdgeSchema]
    node_count: int
    relationship_count: int


class GraphExportRequest(BaseModel):
    format: str  # JSON, GraphML, Cypher


class GraphTestConnectionRequest(BaseModel):
    host: Optional[str] = "127.0.0.1"
    port: Optional[int] = 7687
    target_type: Optional[str] = "NEO4J"
    database_name: Optional[str] = "neo4j"
    username: Optional[str] = "neo4j"
    password: Optional[str] = None

