# System Architecture

## Overview

EVision is a full-stack macroeconomic intelligence platform with a split-backend architecture and a shared PostgreSQL database.

- **Frontend**: React 18 + Vite + Tailwind CSS + Chart.js
- **Django service**: user management, authentication (SimpleJWT), roles, legal agreements, saved presets, admin UI
- **FastAPI service**: indicator catalog, data ingestion, analytics, forecasting, AI insights, world map

## Data Flow

1. User authenticates via Django → receives short-lived JWT access token + httpOnly refresh cookie
2. Frontend calls FastAPI protected endpoints with Bearer JWT
3. FastAPI validates JWT locally (shared secret); for live role/agreement state it introspects Django's `/api/auth/introspect` (non-strict fallback mode allowed in dev)
4. FastAPI serves from PostgreSQL cache; if data is missing for `/observations`, it falls back to World Bank API live-fetch and persists result in background
5. On startup, FastAPI seeds baseline country × indicator combinations in the background (48 countries, 10 indicators)

## Service Boundaries

- **Django** owns: users, roles (`user` / `researcher` / `admin`), user agreements, saved analysis presets, audit logs, admin UI
- **FastAPI** owns: indicator catalog, observation cache, analytics (Lorenz, Gini, correlation, comparison), forecasting, ingestion pipelines, AI chart explanations, income insights, news proxy, world map snapshot

## Infrastructure

| Component | Tech | Purpose |
|---|---|---|
| Database | PostgreSQL 16 (Docker) | Shared store for both services |
| Cache / Rate Limit | Redis 7 | Token bucket rate limiter in FastAPI |
| Auth | Django SimpleJWT + FastAPI JWT verify | Issued by Django, verified by FastAPI |
| AI providers | Gemini / Groq (configured via env) | Chart explanation, income insights |

## API Versioning

All FastAPI endpoints are scoped under `/api/v1`. Django auth endpoints live under `/api/auth/`.

## FastAPI Modules (all shipped)

| Router | Prefix | Description |
|---|---|---|
| observations | `/observations` | Time-series data with live World Bank fallback |
| observations world | `/observations/world` | Choropleth map snapshot (DB cache + background seed) |
| catalog | `/countries`, `/indicators` | Country and indicator catalog |
| analytics | `/correlation`, `/lorenz`, `/gini` | Statistical computations |
| inequality | `/inequality/gini/*` | Gini trends and country rankings |
| forecast | `/forecast` | Linear trend forecast with backtesting |
| ingestion | `/ingest/world-bank` | Manual data ingestion (researcher/admin only) |
| income | `/income/insights` | AI-powered personal income analysis |
| analytics/chart | `/analytics/chart/explain` | AI-powered chart explanation |
| news | `/news` | Cached economic news headlines |
| health | `/health` | Service liveness check |

## Rate Limiting

FastAPI uses a sliding-window token-bucket limiter (5 RPS default, burst 20) backed by Redis. Falls back to permissive in-memory mode when Redis is unavailable.

## Baseline Data Seeding

On every FastAPI startup, a background task seeds 48 baseline countries × 10 baseline indicators from the World Bank API. Already-seeded pairs are skipped. This ensures the world map and analytics have data available without user-triggered ingestion.

## Frontend Architecture

- **React Router v6** single-page app with `AppLayout` wrapper
- **Context providers**: `AuthContext` (JWT + token refresh), `AnalysisContext` (shared indicator/country selection), `ThemeContext` (dark/light), `I18nContext` (7 languages: EN, RU, KZ, DE, FR, ZH, ES), `UIContext`
- **API clients**: `djangoClient` (auth endpoints) and `fastapiClient` (analytics) both have silent 401→refresh interceptors
- **Pages**: Home (landing), `/compare` (multi-country analysis + world map), `/income-analysis`, `/forecast`, `/saved`, `/verify-email`, `/forgot-password`, `/reset-password`

## Docker Compose Setup

```
docker compose up
```

Services: `redis`, `db` (Postgres), `django` (:8000), `fastapi` (:8001)

Frontend is developed separately with `npm run dev` (:5173).
