from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_roles
from app.models_ingestion import IngestionRun
from app.schemas import IngestionRunRead

router = APIRouter(tags=["ingestion"])


@router.get("/ingest/runs", response_model=list[IngestionRunRead])
def list_ingestion_runs(db: Session = Depends(get_db), _: dict = Depends(require_roles("researcher", "admin"))):
    return db.query(IngestionRun).order_by(IngestionRun.id.desc()).limit(100).all()
