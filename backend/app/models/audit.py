from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from app.configuration.database import Base
from app.models.domain import generate_uuid, current_utc_time


class AuditLog(Base):
    """
    Immutable audit logging entity capturing every user action, API call, configuration change,
    and workflow execution across the enterprise platform.
    """
    __tablename__ = 'audit_logs'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    username = Column(String(100), nullable=True, index=True)
    client_ip = Column(String(45), nullable=True)
    action = Column(String(100), nullable=False, index=True) # e.g. PROJECT_CREATE, METADATA_DISCOVER, RULE_UPDATE
    entity_type = Column(String(50), nullable=False, index=True) # e.g. Project, SourceConnection, Workflow
    entity_id = Column(String(36), nullable=True, index=True)
    previous_value_json = Column(JSON, nullable=True)
    new_value_json = Column(JSON, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    outcome = Column(String(20), nullable=False, default="SUCCESS") # SUCCESS, FAILURE, FORBIDDEN
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=current_utc_time, nullable=False, index=True)
