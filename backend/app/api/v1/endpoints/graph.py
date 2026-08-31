from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.graph import EnterpriseGraphModel, GraphExportRequest, GraphTestConnectionRequest
from app.services.graph_service import GraphService

router = APIRouter(prefix="/projects/{project_id}/graph", tags=["Enterprise Knowledge Graph"])


@router.get("/generate", response_model=EnterpriseGraphModel)
def generate_graph(project_id: str, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        return svc.generate_enterprise_graph(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/export")
def export_graph(project_id: str, req: GraphExportRequest, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        model = svc.generate_enterprise_graph(project_id)
        fmt = req.format.upper()
        if fmt == "CYPHER":
            cypher_lines = [
                "// OntoForge - Transform source metadata into semantic knowledge",
                "// Generated for Neo4j / Memgraph Graph Databases",
                "// Preserves Primary Key Constraints & Schema Properties",
                ""
            ]
            # Primary Key Unique Constraints
            cypher_lines.append("// 1. Primary Key Unique Constraints")
            for node in model.nodes:
                if node.properties.get("type") == "Table":
                    lbl = node.label.replace(" ", "")
                    pk = node.properties.get("primary_key", "")
                    if pk:
                        cypher_lines.append(f"CREATE CONSTRAINT IF NOT EXISTS FOR (c:{lbl}) REQUIRE c.primary_key IS UNIQUE;")
            cypher_lines.append("")

            # Node Creation with Primary Keys
            cypher_lines.append("// 2. Graph Nodes & Properties")
            for node in model.nodes:
                if node.properties.get("type") == "Table":
                    lbl = node.label.replace(" ", "")
                    dom = node.properties.get("domain_type", "Transactional")
                    pk = node.properties.get("primary_key", "")
                    comment = (node.properties.get("comment") or "").replace("'", "\\'")
                    cypher_lines.append(f"CREATE (:{lbl}:{dom} {{id: '{node.id}', label: '{lbl}', table_name: '{node.properties.get('table_name')}', primary_key: '{pk}', comment: '{comment}'}});")
            cypher_lines.append("")

            # Relationship Edges
            cypher_lines.append("// 3. Enterprise Lineage Relationships")
            for edge in model.edges:
                rel = edge.relationship.replace(" ", "_").upper()
                cypher_lines.append(f"MATCH (a {{id: '{edge.source_id}'}}), (b {{id: '{edge.target_id}'}}) CREATE (a)-[:{rel}]->(b);")
            return PlainTextResponse(content="\n".join(cypher_lines), media_type="text/plain")

        elif fmt == "GRAPHML":
            import networkx as nx
            import io
            G = nx.DiGraph()
            for node in model.nodes:
                if node.properties.get("type") == "Table":
                    G.add_node(node.id, label=node.label, domain=node.properties.get("domain_type", "Transactional"))
            for edge in model.edges:
                G.add_edge(edge.source_id, edge.target_id, relationship=edge.relationship)
            out = io.BytesIO()
            nx.write_graphml(G, out)
            return PlainTextResponse(content=out.getvalue().decode("utf-8"), media_type="application/xml")

        return model
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sync-to-target")
def sync_to_target_graph(project_id: str, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        return svc.sync_to_target_graph(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/test-connection")
def test_graph_connection_endpoint(project_id: str, req: GraphTestConnectionRequest, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        return svc.test_graph_connection(
            project_id=project_id,
            host=req.host,
            port=req.port,
            target_type=req.target_type,
            database_name=req.database_name,
            username=req.username,
            password=req.password
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/profile-target-schema")
def profile_target_schema(project_id: str, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        return svc.profile_and_persist_target_graph_schema(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/profile-target-schema")
def get_persisted_profile_schema(project_id: str, db: Session = Depends(get_db)):
    svc = GraphService(db)
    try:
        return svc.get_persisted_target_graph_schema(project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

