from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LLMInsightRequest(BaseModel):
    user_prompt: str
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 1000
    model_name: Optional[str] = "gemini-1.5-pro"


class GraphInsightItem(BaseModel):
    title: str
    category: str
    description: str
    confidence_score: float
    impact_level: str  # HIGH, MEDIUM, LOW
    related_entities: List[str]


class LLMInsightResponse(BaseModel):
    project_id: str
    user_prompt: str
    executive_summary: str
    generated_cypher_query: str
    ontology_context_used: Dict[str, Any]
    insights: List[GraphInsightItem]
    cypher_data_records: List[Dict[str, Any]] = []
    execution_time_ms: float


class ApprovedCypherCreate(BaseModel):
    question_prompt: str
    approved_cypher: str
    model_name: Optional[str] = "gemini-1.5-pro"


class ApprovedCypherUpdate(BaseModel):
    question_prompt: Optional[str] = None
    approved_cypher: str


class ApprovedCypherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    question_prompt: str
    approved_cypher: str
    model_name: str
    usage_count: int
    created_at: datetime
    updated_at: datetime

