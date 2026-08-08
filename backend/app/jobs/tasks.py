from app.jobs.celery_app import celery_app
from app.configuration.database import SessionLocal
from app.services.metadata_service import MetadataService
from app.services.profiling_service import ProfilingService
from app.services.graph_service import GraphService
from app.services.ontology_service import OntologyService
from app.utilities.logger import logger


@celery_app.task(name="tasks.execute_metadata_discovery")
def execute_metadata_discovery(project_id: str, connection_id: str):
    logger.info(f"Celery task started: Metadata Discovery for project {project_id}")
    db = SessionLocal()
    try:
        svc = MetadataService(db)
        catalogs = svc.discover_and_catalog(project_id, connection_id)
        return {"status": "SUCCESS", "catalogs_discovered": len(catalogs)}
    except Exception as e:
        logger.error(f"Metadata discovery task failed: {e}")
        return {"status": "FAILED", "error": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.execute_data_profiling")
def execute_data_profiling(project_id: str, connection_id: str):
    logger.info(f"Celery task started: Data Profiling for project {project_id}")
    db = SessionLocal()
    try:
        svc = ProfilingService(db)
        results = svc.profile_project_tables(project_id, connection_id)
        return {"status": "SUCCESS", "tables_profiled": len(results)}
    except Exception as e:
        logger.error(f"Data profiling task failed: {e}")
        return {"status": "FAILED", "error": str(e)}
    finally:
        db.close()
