from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.configuration.config import settings
from app.utilities.logger import logger

# Create SQLAlchemy Engine for MS SQL Server / SQLite (for portable execution)
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        echo=settings.DEBUG
    )
except Exception as e:
    logger.warning(f"SQL Server connection string initialization warning: {e}. Falling back to SQLite memory/file for development.")
    # Fallback to local SQLite DB if ODBC SQL Server driver is not present on dev host
    sqlite_url = "sqlite:///./quick_pasteur_app.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection generator yielding an active database session per request.
    Ensures graceful session cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
