from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.domain import SourceConnectorType, TargetGraphType


class SourceConnectionCreate(BaseModel):
    name: str
    connector_type: SourceConnectorType
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    connection_options_json: Optional[Dict[str, Any]] = None


class SourceConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    connector_type: SourceConnectorType
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    is_active: bool
    last_tested_at: Optional[datetime] = None
    last_status: Optional[str] = None
    created_at: datetime


class GraphConfigCreate(BaseModel):
    name: str
    target_type: TargetGraphType
    host: str
    port: int
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    options_json: Optional[Dict[str, Any]] = None


class GraphConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    target_type: TargetGraphType
    host: str
    port: int
    database_name: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime


class MetadataColumnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    table_id: str
    column_name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    is_foreign_key: bool
    foreign_table_name: Optional[str] = None
    foreign_column_name: Optional[str] = None
    pii_tag: str
    column_comment: Optional[str] = None


class MetadataTableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    schema_name: str
    table_name: str
    object_type: str
    row_count: int
    table_comment: Optional[str] = None
    columns: List[MetadataColumnResponse] = []
    discovered_at: datetime


class ProfilingResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    metadata_catalog_id: str
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    row_count: int
    column_stats_json: Dict[str, Any]
    quality_score: float
    primary_keys: List[str] = []
    profiled_at: datetime


class ColumnPIIItem(BaseModel):
    pii_tagged: bool
    pii_type: str = "NONE"


class PIIUpdateRequest(BaseModel):
    column_pii_map: Dict[str, ColumnPIIItem]

