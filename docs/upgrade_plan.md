## Upgrade plan: market-ready Economic Web Platform

### Current architecture (as-is)

The repository is a split-backend full-stack app:

- **Frontend**: React + Vite + Tailwind + Chart.js (`frontend/`)
- **Django API**: auth, roles, user agreement, admin (`backend/django_service/`)
- **FastAPI API**: data catalog, observations, analytics, ingestion, forecast (`backend/fastapi_service/`)

Data flow today:

1) Frontend authenticates via Django, receives JWT (SimpleJWT).
2) Frontend calls FastAPI with the same JWT for protected endpoints.
3) FastAPI reads from its own DB. If data is missing, `/observations` falls back to World Bank API “live”.

### Repository audit (issues list)

#### Security / correctness
- **Forecast endpoint is not protected**: `POST /api/v1/forecast` does not require JWT.
- **Agreement acceptance is not enforced server-side** for forecast (only UI-side).
- **JWT claim freshness**: `agreement_accepted` is embedded in access token at issuance time; after accepting the agreement, the frontend does not refresh the token. If FastAPI checks `agreement_accepted` only from JWT, it will incorrectly deny until re-login.
- **Rate limiting отсутствует**: both Django and FastAPI allow unlimited requests; `/observations` passthrough can abuse upstream APIs.
- **Input validation is light**: country/indicator queries accept arbitrary strings; error messages are inconsistent.
- **CORS config is scattered**: Django uses a custom middleware; FastAPI has hardcoded origins.

#### Product / UX
- No “Saved sessions / presets” (required feature) and no server-side storage for analysis presets.
- Correlation is computed in frontend; server-side correlation exists but isn’t used by UI and is only for a single country at a time.
- “Transparency panel” exists partially in UI copy, but there is no consistent server-provided metadata (source, last updated, missing coverage).

#### Engineering quality
- No Docker Compose stack; no Postgres setup; unclear “prod-like” run instructions.
- No automated tests (FastAPI analytics + JWT, Django auth/agreement + saved presets, minimal frontend checks).
- Docs mismatch: architecture doc suggests a shared DB; README mentions separate SQLite by default.

### Target product architecture (incremental, realistic)

#### Databases
- **Postgres** via Docker Compose (single instance), with **two schemas**:
  - `django` schema for Django (users, agreements, saved sessions)
  - `analytics` schema for FastAPI (observations cache, analytics results, forecast runs)
- Keep SQLite as **non-docker fallback** for <10 min setup.

#### Auth strategy (consistent)
- **JWT is issued by Django** (SimpleJWT).
- **FastAPI validates JWT** locally (shared secret by default). Optionally supports RS256 later.
- **FastAPI fetches live authorization state** (role + agreement acceptance) from Django introspection endpoint:
  - Use `/api/auth/introspect` with the same bearer token.
  - Cache introspection result briefly (e.g., 60s) to reduce load.
  - This solves the “agreement accepted after token issuance” problem without forcing token refresh.

Protected resources:
- Advanced analytics: `/lorenz`, `/gini`, `/correlation`, `/forecast`, `/ingest/*`
- Public: `/health`, `/countries`, `/indicators`, `/observations` (keep public but rate-limit)

Agreement enforcement:
- Require agreement acceptance for `/forecast` and advanced analytics.
- Ingestion additionally requires role `researcher` or `admin`.

#### Rate limiting (simple + student-friendly)
- FastAPI: in-memory token bucket per IP + route group (dev-friendly), configurable via env.
- Django: DRF throttling for auth endpoints (login/register) and any new “saved sessions” endpoints.

#### Product features (incremental deliverables)
- Inequality trend: server endpoint to return Gini time series (from World Bank + cached), YoY changes, ranking snapshot.
- Comparison dashboard upgrades: difference/ratio views computed server-side and exported.
- Export: CSV for any time-series, and chart as PNG on frontend.
- Saved sessions: Django model + CRUD endpoints; frontend “Saved” page to load presets.
- Transparency panel: server metadata on source, coverage, missing years, and last updated.

#### Forecasting upgrade (defensible)
- Keep linear trend as baseline.
- Add an alternative simple model (ETS or ARIMA) only if dependency impact is acceptable; otherwise keep regression but add:
  - backtesting (rolling-origin) and MAE/RMSE metrics
  - clear “limitations” text + disclaimer (UI + server response)

### Implementation steps (mapped to required phases)

#### Step 1 — Audit + migration plan (this doc)
Deliverables:
- This `docs/upgrade_plan.md` with:
  - issues list
  - target architecture
  - step-by-step plan

Acceptance criteria:
- Clear and actionable checklist for 3 students.

#### Step 2 — Security/auth unification
Work items:
- Protect `POST /forecast` + `GET /forecast/latest` with JWT + agreement enforcement.
- Add a shared `AuthContext` dependency in FastAPI:
  - `get_current_user()` verifies JWT
  - `get_authz()` calls Django `/api/auth/introspect` (cached)
  - `require_roles()` checks role consistently
  - `require_agreement()` checks agreement consistently
- Add minimal rate limit middleware in FastAPI + DRF throttles in Django.
- Tighten validation (country codes, indicator codes, year bounds).
- Update README with env vars and security model.

Acceptance criteria:
- Calling protected endpoints without JWT returns **401**.
- Calling forecast/advanced analytics without accepted agreement returns **403**.
- Ingestion endpoints require `researcher/admin`.

#### Step 3 — Core product feature upgrades
Work items:
- Saved sessions (Django model + API + frontend page).
- Trend analytics endpoints (Gini over time, rankings).
- Export improvements (CSV everywhere, chart PNG).
- Comparison enhancements (difference/ratio views; multi-indicator correlation exploration).

#### Step 4 — Forecast improvements + evaluation
Work items:
- Add backtesting with MAE/RMSE.
- Return evaluation metrics in forecast response.
- Add “model limitations” section in UI.

#### Step 5 — UI/UX redesign
Work items:
- Navigation layout: Dashboard, Inequality, Indicators, Forecast, Saved.
- Consistent components, empty/loading/error states.
- Responsive chart layout improvements.

#### Step 6 — Docker + tests + documentation
Work items:
- Docker Compose: frontend + Django + FastAPI + Postgres.
- `.env.example` for all services.
- Tests:
  - FastAPI unit tests (Lorenz/Gini, JWT validation)
  - Django tests (auth, agreement, saved sessions)
  - Frontend: lint + minimal smoke test
- Polished README and product spec in `docs/product_spec.md`.

