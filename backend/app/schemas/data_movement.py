from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DataMovementExecutionRequest(BaseModel):
    source_connection_id: Optional[str] = None
    migration_mode: str = "FULL_REFRESH"  # FULL_REFRESH, INCREMENTAL, ONTOLOGY_MAPPED
    enforce_business_rules: bool = True
    batch_size: int = 1000


class DataMovementJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    job_name: str
    source_connection_id: Optional[str] = None
    source_connection_name: Optional[str] = "All Sources"
    target_graph_id: Optional[str] = None
    target_graph_name: Optional[str] = "Target Neo4j Cluster"
    migration_mode: str
    status: str
    records_extracted: int
    nodes_created: int
    relationships_created: int
    quality_checks_passed: int
    execution_time_ms: float
    log_output: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class DataMovementMappingResponse(BaseModel):
    project_id: str
    source_tables_count: int
    ontology_classes_count: int
    ontology_attributes_count: int
    target_graph_type: str
    target_graph_host: str
    pipeline_stages: List[Dict[str, Any]]
    mappings: List[Dict[str, Any]]
