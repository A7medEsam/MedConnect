from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column_migrations():
    """Idempotently add new columns to existing SQLite tables without touching existing rows."""
    migrations = {
        "doctor_profiles": [
            ("specialty_id", "VARCHAR(50) DEFAULT 'gp'"),
            ("location", "VARCHAR(100)"),
            ("consultation_fee", "VARCHAR(50) DEFAULT '150 SAR'"),
            ("verification_status", "VARCHAR(30) DEFAULT 'unverified'"),
            ("verification_document", "VARCHAR(255)"),
            ("verification_notes", "TEXT"),
            ("is_demo", "BOOLEAN DEFAULT 0"),
        ],
        "appointments": [
            ("consultation_fee", "VARCHAR(50)"),
            ("payment_method", "VARCHAR(30) DEFAULT 'clinic'"),
            ("payment_status", "VARCHAR(30) DEFAULT 'pay_at_clinic'"),
        ],
        "reports": [
            ("last_error_json", "TEXT"),
        ],
        "messages": [
            ("content_en", "TEXT"),
            ("content_ar", "TEXT"),
        ],
    }

    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table, cols in migrations.items():
            if table not in existing_tables:
                continue
            existing_cols = {c["name"] for c in insp.get_columns(table)}
            for col_name, col_def in cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))


def init_db():
    """Create all tables, apply safe schema migrations, and seed demo/clinical data idempotently."""
    from app import models  # noqa: F401
    from app.seed_data import seed_all

    Base.metadata.create_all(bind=engine)
    _ensure_column_migrations()

    db = SessionLocal()
    try:
        seed_all(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
