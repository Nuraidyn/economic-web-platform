# System Architecture

## Overview
The platform is split into two backend services with a shared database:

- Django service: user management, authentication, legal compliance, and admin.
- FastAPI service: data ingestion, analytics, and forecasting APIs.

The frontend talks to both services through REST APIs. Django issues JWTs used to access FastAPI.

## Data Flow
1. External sources (World Bank, IMF, OECD) are ingested by FastAPI jobs.
2. Normalized observations are stored in the shared database.
3. FastAPI exposes analytics endpoints for time series, Lorenz/Gini, comparisons, and forecasts.
4. Django enforces authentication and legal agreements, and issues JWTs.
5. Frontend consumes protected APIs using the JWT.

## Service Boundaries
- Django owns: users, roles, agreements, audit logs, admin UI.
- FastAPI owns: indicator catalog, ingestion pipelines, computations, forecasts.

## API Versioning
All analytical endpoints are scoped under `/api/v1` in FastAPI.

## Planned Modules
- Ingestion: source adapters, validation, and provenance metadata.
- Analytics: Lorenz/Gini calculations, multi-indicator comparisons.
- Forecasting: explainable models with stored assumptions and confidence bands.
