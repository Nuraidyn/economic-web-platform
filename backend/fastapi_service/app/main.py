import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analytics import router as analytics_router
from app.api.v1.news import router as news_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.health import router as health_router
from app.api.v1.inequality import router as inequality_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.ingestion_runs import router as ingestion_runs_router
from app.api.v1.income import router as income_router
from app.api.v1.observations import router as observations_router
from app.core.config import (
    APP_ENV, CORS_ALLOW_ORIGINS, JWT_SECRET,
    RATE_LIMIT_BURST, RATE_LIMIT_ENABLED, RATE_LIMIT_RPS,
    RATE_LIMIT_REDIS_FAIL_OPEN, REDIS_URL,
)
from app.db import Base, engine
from app.middleware.rate_limit import RateLimitMiddleware
from app.migrations import ensure_indexes
import app.models_analytics  # noqa: F401
import app.models_forecast  # noqa: F401
import app.models_ingestion  # noqa: F401

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Economic Analytics Service",
    version="0.1.0",
    description="Analytics, ingestion, and forecasting APIs for economic indicators.",
)

app.add_middleware(
    RateLimitMiddleware,
    enabled=RATE_LIMIT_ENABLED,
    rps=RATE_LIMIT_RPS,
    burst=RATE_LIMIT_BURST,
    fail_open=RATE_LIMIT_REDIS_FAIL_OPEN,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(income_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
app.include_router(ingestion_router, prefix="/api/v1")
app.include_router(ingestion_runs_router, prefix="/api/v1")
app.include_router(observations_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(inequality_router, prefix="/api/v1")
app.include_router(forecast_router, prefix="/api/v1")
app.include_router(news_router, prefix="/api/v1")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
    ensure_indexes(engine)


@app.on_event("startup")
def check_secret_key():
    _INSECURE_DEFAULTS = {"dev-secret-key", "secret", "changeme", ""}
    if APP_ENV == "production" and JWT_SECRET in _INSECURE_DEFAULTS:
        raise RuntimeError(
            "SECURITY: JWT_SECRET / DJANGO_SECRET_KEY is set to an insecure default value. "
            "Set a strong random secret in your .env before running in production."
        )


@app.on_event("startup")
async def setup_redis():
    """Connect to Redis for the rate limiter; store client in app.state.redis."""
    if not REDIS_URL:
        logger.info("REDIS_URL not set — rate limiter running in permissive mode.")
        app.state.redis = None
        return
    try:
        import redis.asyncio as aioredis
        pool = aioredis.ConnectionPool.from_url(
            REDIS_URL,
            max_connections=20,
            decode_responses=False,
        )
        client = aioredis.Redis(connection_pool=pool)
        await client.ping()
        app.state.redis = client
        logger.info("Redis connected: %s", REDIS_URL.split("@")[-1])
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — rate limiter fallback active.", exc)
        app.state.redis = None


@app.on_event("startup")
async def seed_baseline_data():
    """Pre-populate DB with baseline country×indicator data in a background thread pool."""
    asyncio.create_task(_run_baseline_seed())


async def _run_baseline_seed():
    from app.data.baseline import BASELINE_COUNTRIES, BASELINE_INDICATORS
    loop = asyncio.get_event_loop()
    # Semaphore limits concurrent World Bank API calls to avoid rate-limiting
    sem = asyncio.Semaphore(4)

    async def _seed_one(country: str, indicator: str):
        async with sem:
            await loop.run_in_executor(_SEED_EXECUTOR, _seed_sync, country, indicator)

    tasks = [
        _seed_one(country, indicator)
        for country in BASELINE_COUNTRIES
        for indicator in BASELINE_INDICATORS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    errors = [r for r in results if isinstance(r, Exception)]
    if errors:
        logger.warning("Baseline seed finished with %d error(s): first=%s", len(errors), errors[0])
    else:
        logger.info("Baseline seed complete (%d combos)", len(tasks))


_SEED_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="baseline-seed")


def _seed_sync(country: str, indicator: str) -> None:
    from app.db import SessionLocal
    from app.models import Country, Indicator, Observation
    from app.services.ingestion import ingest_indicator

    db = SessionLocal()
    try:
        country_row = db.query(Country).filter(Country.code == country).first()
        indicator_row = db.query(Indicator).filter(Indicator.code == indicator).first()
        if country_row and indicator_row:
            count = (
                db.query(Observation)
                .filter(
                    Observation.country_id == country_row.id,
                    Observation.indicator_id == indicator_row.id,
                )
                .count()
            )
            if count > 0:
                return  # Already seeded — skip
        ingest_indicator(db, country, indicator)
    except Exception as exc:
        logger.warning("baseline seed %s/%s: %s", country, indicator, exc)
    finally:
        db.close()


@app.on_event("shutdown")
async def close_redis():
    client = getattr(app.state, "redis", None)
    if client is not None:
        await client.aclose()
