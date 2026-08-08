import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum, JSON, Table
)
from sqlalchemy.orm import relationship
import enum
from app.configuration.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def current_utc_time() -> datetime:
    return datetime.now(timezone.utc)


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DRAFT = "DRAFT"


class SourceConnectorType(str, enum.Enum):
    MSSQL = "MSSQL"
    POSTGRESQL = "POSTGRESQL"
    MYSQL = "MYSQL"
    MARIADB = "MARIADB"
    ORACLE = "ORACLE"
    DATABRICKS = "DATABRICKS"
    SNOWFLAKE = "SNOWFLAKE"
    SYNAPSE = "SYNAPSE"
    REDSHIFT = "REDSHIFT"
    SQLITE = "SQLITE"


class TargetGraphType(str, enum.Enum):
    NEO4J = "NEO4J"
    MEMGRAPH = "MEMGRAPH"
    APACHE_AGE = "APACHE_AGE"


class BusinessRuleType(str, enum.Enum):
    VALIDATION = "VALIDATION"
    TRANSFORMATION = "TRANSFORMATION"
    LOOKUP = "LOOKUP"
    MASKING = "MASKING"
    QUALITY = "QUALITY"
    ENRICHMENT = "ENRICHMENT"
    CUSTOM = "CUSTOM"


class WorkflowStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# Association table for User Roles
user_roles_table = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', String(36), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)


class Role(Base):
    __tablename__ = 'roles'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    users = relationship('User', secondary=user_roles_table, back_populates='roles')


class User(Base):
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)
    updated_at = Column(DateTime, default=current_utc_time, onupdate=current_utc_time, nullable=False)

    roles = relationship('Role', secondary=user_roles_table, back_populates='users')
    projects = relationship('Project', back_populates='owner', cascade='all, delete-orphan')


class Project(Base):
    __tablename__ = 'projects'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False)
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)
    updated_at = Column(DateTime, default=current_utc_time, onupdate=current_utc_time, nullable=False)

    owner = relationship('User', back_populates='projects')
    source_connections = relationship('SourceConnection', back_populates='project', cascade='all, delete-orphan')
    graph_configs = relationship('GraphConfig', back_populates='project', cascade='all, delete-orphan')
    ontology_configs = relationship('OntologyConfig', back_populates='project', cascade='all, delete-orphan')
    metadata_tables = relationship('MetadataTable', back_populates='project', cascade='all, delete-orphan')
    ontology_classes = relationship('OntologyClass', back_populates='project', cascade='all, delete-orphan')
    business_rules = relationship('BusinessRule', back_populates='project', cascade='all, delete-orphan')
    workflows = relationship('Workflow', back_populates='project', cascade='all, delete-orphan')


class SourceConnection(Base):
    __tablename__ = 'source_connections'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    connector_type = Column(SQLEnum(SourceConnectorType), nullable=False)
    host = Column(String(255), nullable=True)
    port = Column(Integer, nullable=True)
    database_name = Column(String(100), nullable=True)
    username = Column(String(100), nullable=True)
    encrypted_password = Column(Text, nullable=True)
    connection_options_json = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_tested_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='source_connections')


class GraphConfig(Base):
    __tablename__ = 'graph_configs'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    target_type = Column(SQLEnum(TargetGraphType), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database_name = Column(String(100), nullable=True)
    username = Column(String(100), nullable=True)
    encrypted_password = Column(Text, nullable=True)
    options_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='graph_configs')


class OntologyConfig(Base):
    __tablename__ = 'ontology_configs'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    ontology_name = Column(String(150), nullable=False)
    base_iri = Column(String(255), nullable=False, default="http://enterprise.org/ontology#")
    prefix = Column(String(20), nullable=False, default="eonto")
    version = Column(String(20), nullable=False, default="1.0.0")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='ontology_configs')


# --- PHYSICAL METADATA LAYER ---

class MetadataTable(Base):
    __tablename__ = 'metadata_tables'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    source_connection_id = Column(String(36), ForeignKey('source_connections.id', ondelete='SET NULL'), nullable=True)
    schema_name = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    object_type = Column(String(20), default="TABLE")
    row_count = Column(Integer, default=0, nullable=False)
    table_comment = Column(Text, nullable=True)
    discovered_at = Column(DateTime, default=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='metadata_tables')
    source_connection = relationship('SourceConnection')
    columns = relationship('MetadataColumn', back_populates='table', cascade='all, delete-orphan')
    ontology_class = relationship('OntologyClass', back_populates='mapped_table', uselist=False)


class MetadataColumn(Base):
    __tablename__ = 'metadata_columns'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_id = Column(String(36), ForeignKey('metadata_tables.id', ondelete='CASCADE'), nullable=False)
    column_name = Column(String(100), nullable=False)
    data_type = Column(String(100), nullable=False)
    is_nullable = Column(Boolean, default=True, nullable=False)
    is_primary_key = Column(Boolean, default=False, nullable=False)
    is_foreign_key = Column(Boolean, default=False, nullable=False)
    foreign_table_name = Column(String(100), nullable=True)
    foreign_column_name = Column(String(100), nullable=True)
    pii_tag = Column(String(50), default="NONE", nullable=False)
    column_comment = Column(Text, nullable=True)

    table = relationship('MetadataTable', back_populates='columns')
    ontology_attribute = relationship('OntologyAttribute', back_populates='mapped_column', uselist=False)


class ProfilingResult(Base):
    __tablename__ = 'profiling_results'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    metadata_catalog_id = Column(String(36), ForeignKey('metadata_tables.id', ondelete='CASCADE'), nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_stats_json = Column(JSON, nullable=False)
    quality_score = Column(Float, default=100.0, nullable=False)
    profiled_at = Column(DateTime, default=current_utc_time, nullable=False)



# --- SEMANTIC ONTOLOGY LAYER ---

class OntologyClass(Base):
    __tablename__ = 'ontology_classes'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    mapped_table_id = Column(String(36), ForeignKey('metadata_tables.id', ondelete='SET NULL'), nullable=True)
    class_name = Column(String(100), nullable=False)
    class_iri = Column(String(255), nullable=True)
    subclass_of = Column(String(100), default="owl:Thing", nullable=False)
    domain_type = Column(String(50), default="Transactional", nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)
    updated_at = Column(DateTime, default=current_utc_time, onupdate=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='ontology_classes')
    mapped_table = relationship('MetadataTable', back_populates='ontology_class')
    attributes = relationship('OntologyAttribute', foreign_keys='OntologyAttribute.class_id', back_populates='ontology_class', cascade='all, delete-orphan')


class OntologyAttribute(Base):
    __tablename__ = 'ontology_attributes'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    class_id = Column(String(36), ForeignKey('ontology_classes.id', ondelete='CASCADE'), nullable=False)
    mapped_column_id = Column(String(36), ForeignKey('metadata_columns.id', ondelete='SET NULL'), nullable=True)
    target_class_id = Column(String(36), ForeignKey('ontology_classes.id', ondelete='SET NULL'), nullable=True)
    attribute_name = Column(String(100), nullable=False)
    attribute_iri = Column(String(255), nullable=True)
    property_type = Column(String(50), default="DatatypeProperty", nullable=False)  # DatatypeProperty or ObjectProperty
    range_datatype = Column(String(100), default="xsd:string", nullable=False)
    is_primary_key = Column(Boolean, default=False, nullable=False)
    parent_class_name = Column(String(100), nullable=True)
    target_class_name = Column(String(100), nullable=True)
    relationship_name = Column(String(100), nullable=True)
    inverse_property_name = Column(String(100), nullable=True)
    is_inverse = Column(Boolean, default=False, nullable=False)
    comment = Column(Text, nullable=True)

    ontology_class = relationship('OntologyClass', foreign_keys=[class_id], back_populates='attributes')
    mapped_column = relationship('MetadataColumn', back_populates='ontology_attribute')
    target_class = relationship('OntologyClass', foreign_keys=[target_class_id])


class BusinessRule(Base):
    __tablename__ = 'business_rules'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(150), nullable=False)
    rule_type = Column(SQLEnum(BusinessRuleType), nullable=True, default=BusinessRuleType.VALIDATION)
    rule_definition = Column(Text, nullable=True)
    target_entity = Column(String(100), nullable=True)
    target_attribute = Column(String(100), nullable=True)
    definition_json = Column(JSON, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)
    updated_at = Column(DateTime, default=current_utc_time, onupdate=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='business_rules')


class Workflow(Base):
    __tablename__ = 'workflows'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    steps_json = Column(JSON, nullable=False)
    cron_expression = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=current_utc_time, nullable=False)

    project = relationship('Project', back_populates='workflows')
    executions = relationship('JobExecution', back_populates='workflow', cascade='all, delete-orphan')


class JobExecution(Base):
    __tablename__ = 'job_executions'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.PENDING, nullable=False)
    started_at = Column(DateTime, default=current_utc_time, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    log_output = Column(Text, nullable=True)
    metrics_json = Column(JSON, nullable=True)

    workflow = relationship('Workflow', back_populates='executions')


class SystemSetting(Base):
    __tablename__ = 'system_settings'

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=current_utc_time, onupdate=current_utc_time, nullable=False)
