from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, projects, connectors, metadata, profiling, graph, ontology, rules, workflows, dashboard, audit
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(connectors.router)
api_router.include_router(metadata.router)
api_router.include_router(profiling.router)
api_router.include_router(graph.router)
api_router.include_router(ontology.router)
api_router.include_router(rules.router)
api_router.include_router(workflows.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit.router)
