from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.configuration.config import settings
from app.utilities.logger import logger

# Create SQLAlchemy Engine (Defaults to SQLite for local development; supports MSSQL when configured)
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG
    )
    logger.info(f"Initialized SQLite application database: {settings.DATABASE_URL}")
else:
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
            echo=settings.DEBUG
        )
        # Test connection immediately
        with engine.connect() as conn:
            pass
        logger.info(f"Successfully connected to database: {settings.DB_SERVER}")
    except Exception as e:
        logger.warning(f"SQL Server connection failed: {e}. Falling back to SQLite for development.")
        sqlite_url = f"sqlite:///{settings.SQLITE_DB_PATH.replace('\\', '/')}"
        engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def sync_sqlite_schema():
    """Dynamically adds missing columns to existing SQLite database tables if any were added to models."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check ontology_attributes columns
            res = conn.execute(text("PRAGMA table_info(ontology_attributes)")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                if "parent_class_name" not in existing_cols:
                    conn.execute(text("ALTER TABLE ontology_attributes ADD COLUMN parent_class_name VARCHAR(100)"))
                if "target_class_name" not in existing_cols:
                    conn.execute(text("ALTER TABLE ontology_attributes ADD COLUMN target_class_name VARCHAR(100)"))
                if "relationship_name" not in existing_cols:
                    conn.execute(text("ALTER TABLE ontology_attributes ADD COLUMN relationship_name VARCHAR(100)"))
                if "inverse_property_name" not in existing_cols:
                    conn.execute(text("ALTER TABLE ontology_attributes ADD COLUMN inverse_property_name VARCHAR(100)"))
                if "is_inverse" not in existing_cols:
                    conn.execute(text("ALTER TABLE ontology_attributes ADD COLUMN is_inverse BOOLEAN DEFAULT 0"))
                conn.commit()
    except Exception as e:
        logger.warning(f"SQLite schema auto-migration check skipped: {e}")


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
