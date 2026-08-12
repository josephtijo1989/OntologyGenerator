import os
import sys

# Ensure backend directory is in Python path for all execution modes and PyCharm runners
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.configuration.config import settings
from app.configuration.database import engine, Base, SessionLocal, sync_sqlite_schema
from app.api.v1.router import api_router
from app.models.domain import User, Role
from app.utilities.logger import logger

# Auto-create all tables in target application database on startup
Base.metadata.create_all(bind=engine)
sync_sqlite_schema()



def seed_initial_data():
    """Seeds default admin user and roles only. All project data remains completely clean and empty."""
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(name="ADMIN", description="System Administrator")
            db.add(admin_role)
            db.commit()

        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            user = User(
                id="00000000-0000-0000-0000-000000000001",
                username="admin",
                email="admin@enterprise.com",
                hashed_password="hashed_admin_password_seed",
                full_name="Enterprise System Administrator",
                is_active=True,
                is_superuser=True
            )
            user.roles.append(admin_role)
            db.add(user)
            db.commit()

        logger.info("Successfully initialized clean database schema (0 projects, 0 tables, 0 ontologies).")
    except Exception as e:
        logger.warning(f"Database seed skipped or failed: {e}")
    finally:
        db.close()


seed_initial_data()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root_index():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/app")


import os
from fastapi.staticfiles import StaticFiles

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/app", response_class=HTMLResponse, tags=["Web Application UI"])
def serve_web_app():
    html_path = os.path.join(static_dir, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()
    response = HTMLResponse(content=content)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/health", tags=["Health Monitoring"])
def health_check():
    return {
        "status": "UP",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

