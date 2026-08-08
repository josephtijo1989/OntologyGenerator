# Technical Architecture & System Design Specification

## Executive Summary
The Quick-Pasteur Enterprise Platform is designed as an end-to-end, multi-tenant relational-to-graph and semantic ontology transformation engine.

## Architectural Layers (Strict 3-Tier Architecture)

1. **Presentation Layer (Controllers & OpenAPI)**:
   - FastAPI APIRouter endpoints located in `backend/app/api/v1/endpoints/`.
   - Strictly responsible for HTTP request handling, Pydantic model validation, status code mapping, and route parameter extraction.
   - Business logic is strictly prohibited inside controllers.

2. **Business Service Layer**:
   - Encapsulated within `backend/app/services/`.
   - Implements domain rules, metadata inferencing, data profiling, RDFLib ontology generation, NetworkX graph model conversion, and Celery background task dispatch.

3. **Data Access Layer (Repositories Pattern)**:
   - Located in `backend/app/repositories/`.
   - Utilizes SQLAlchemy 2.0 ORM with typed generics for standard CRUD operations and custom SQL Server query building.

## Design Patterns Implemented
- **Repository Pattern**: Abstrates database CRUD operations from business logic (`BaseRepository`).
- **Strategy & Factory Pattern**: Plugin-based source database connectors (`BaseConnector`, `ConnectorFactory`).
- **Adapter Pattern**: Target graph database connectors (`BaseGraphAdapter`, `Neo4jAdapter`, `MemgraphAdapter`, `ApacheAGEAdapter`).
- **Builder Pattern**: Dynamic construction of OWL ontology classes and properties via `OntologyGenerator`.
- **Dependency Injection**: FastAPI `Depends(get_db)` injection for automatic database connection lifecycles.
