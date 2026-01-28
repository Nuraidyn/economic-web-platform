from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_roles
from app.schemas import IngestionRequest
from app.services.ingestion import ingest_indicator

router = APIRouter(tags=["ingestion"])


@router.post("/ingest/world-bank")
def ingest_world_bank(
    payload: IngestionRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles("researcher", "admin")),
):
    try:
        result = ingest_indicator(db, payload.country, payload.indicator)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "country": payload.country,
        "indicator": payload.indicator,
        "inserted": result["inserted"],
        "total": result["total"],
        "expected": result["expected"],
        "missing": result["missing"],
        "run_id": result["run_id"],
    }
