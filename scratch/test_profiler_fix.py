import os
import sys

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.configuration.database import SessionLocal
from app.models.domain import Project, GraphConfig
from app.services.graph_service import GraphService
from app.utilities.encryption import cipher

def update_and_test():
    db = SessionLocal()
    try:
        p = db.query(Project).filter(Project.name == "Mars").first()
        if not p:
            print("Project Mars not found.")
            return

        g_cfg = db.query(GraphConfig).filter(GraphConfig.project_id == p.id).first()
        if g_cfg:
            print(f"Updating password for GraphConfig '{g_cfg.name}'...")
            # Set explicit encrypted password if needed
            g_cfg.encrypted_password = cipher.encrypt("neo4j")
            db.commit()

        svc = GraphService(db)
        res = svc.profile_and_persist_target_graph_schema(p.id)
        print("PROFILER SUCCESS RESULT:")
        print(res)
    except Exception as e:
        print(f"PROFILER EXCEPTION: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_and_test()
