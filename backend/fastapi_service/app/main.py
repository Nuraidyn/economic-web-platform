from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analytics import router as analytics_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.health import router as health_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.ingestion_runs import router as ingestion_runs_router
from app.api.v1.observations import router as observations_router
from app.db import Base, engine
import app.models_analytics  # noqa: F401
import app.models_forecast  # noqa: F401
import app.models_ingestion  # noqa: F401

app = FastAPI(
    title="Economic Analytics Service",
    version="0.1.0",
    description="Analytics, ingestion, and forecasting APIs for economic indicators.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
app.include_router(ingestion_router, prefix="/api/v1")
app.include_router(ingestion_runs_router, prefix="/api/v1")
app.include_router(observations_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(forecast_router, prefix="/api/v1")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
