# Deployment & Operations Guide

## Quick Start with Docker Compose

1. **Clone Repository**:
   ```bash
   git clone <repo-url>
   cd quick-pasteur
   ```

2. **Launch Container Stack**:
   ```bash
   docker-compose -f deployments/docker-compose.yml up -d --build
   ```

3. **Access Services**:
   - **Angular Frontend UI**: `http://localhost:4200`
   - **FastAPI OpenAPI Swagger Documentation**: `http://localhost:8000/docs`
   - **MS SQL Server**: `localhost:1433` (User: `sa`, Password: `YourStrongPass123!`)
   - **Redis Task Queue**: `localhost:6379`
