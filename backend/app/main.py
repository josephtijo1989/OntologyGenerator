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


@app.get("/health", tags=["Health Monitoring"])
def health_check():
    return {
        "status": "UP",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/{file_path:path}", include_in_schema=False)
def serve_spa_or_static(file_path: str = ""):
    # 1. Direct SPA root or /app request
    if not file_path or file_path in ["app", "index.html"]:
        html_path = os.path.join(static_dir, "index.html")
        if os.path.exists(html_path):
            return FileResponse(html_path, headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            })

    # 2. Check if requested static file exists (e.g. main-*.js, polyfills-*.js, styles-*.css, favicon.ico)
    target_file = os.path.join(static_dir, file_path)
    if os.path.isfile(target_file):
        return FileResponse(target_file)

    # 3. Fallback to SPA index.html for Angular client-side routes
    html_path = os.path.join(static_dir, "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path, headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })

    return HTMLResponse("<h1>404 Not Found</h1>", status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)

