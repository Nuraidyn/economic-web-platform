## Upgrade history: EVision — Macroeconomic Intelligence Platform

### Status: All original upgrade steps completed ✓

---

### Original issues (all resolved)

| Issue | Status |
|---|---|
| Forecast endpoint unprotected | ✓ JWT + agreement required |
| Agreement not enforced server-side | ✓ FastAPI introspects Django |
| JWT claim freshness for agreement | ✓ Live introspection, no stale JWT state |
| Rate limiting absent | ✓ Redis token-bucket, 5 RPS / burst 20 |
| Input validation light | ✓ Annotated Query params with regex + bounds |
| CORS config scattered | ✓ Env-var `CORS_ALLOW_ORIGINS` in FastAPI, settings in Django |
| No saved presets | ✓ Django model + CRUD + frontend drawer |
| Correlation frontend-only | ✓ Server-side Pearson in `/correlation` |
| No Docker Compose | ✓ Full stack: Redis + Postgres + Django + FastAPI |
| No tests | ✓ pytest for FastAPI analytics, Django auth/presets, Vitest frontend |
| Docs mismatch | ✓ Updated docs |

---

### Completed upgrade steps

#### Step 1 — Audit + migration plan ✓
Delivered `docs/upgrade_plan.md` with issues list, target architecture, and step plan.

#### Step 2 — Security/auth unification ✓
- FastAPI `require_agreement()` and `require_roles()` via Django introspection
- Non-strict fallback (JWT claims) when introspection unavailable
- Redis token-bucket rate limiter in FastAPI middleware
- DRF throttles on Django auth endpoints
- Validated `CountryCodeParam`, `IndicatorCodeParam`, `YearParam` with Annotated + Query

#### Step 3 — Core product features ✓
- Saved analysis presets (Django model + API + frontend drawer)
- Lorenz curve + Gini trend + Gini ranking endpoints
- Pearson correlation server-side endpoint
- CSV export (per indicator, per comparison)
- Chart PNG download
- Multi-indicator comparison dashboard

#### Step 4 — Forecast improvements ✓
- Rolling-origin backtest with MAE/RMSE
- Metrics returned in forecast API response
- Model limitations and academic disclaimers in UI

#### Step 5 — UI/UX redesign ✓
- Full redesign with landing page, scroll-reveal animations
- Compare page with multi-selector, chart toolbar, timeframe chips
- Consistent panel/card components, dark/light theme, skeleton loaders
- Responsive layout (mobile-first)

#### Step 6 — Docker + tests + docs ✓
- Docker Compose: redis + db + django + fastapi
- `.env` configuration for all services
- Unit tests: FastAPI (analytics, auth), Django (auth, agreements, presets), Frontend (Vitest)
- Architecture, product spec, UI spec, design system documented

---

### Post-upgrade additions

These features were added after the initial upgrade plan was completed:

#### World map (ChoroplethMap)
- Choropleth visualization of 180+ countries for 7 economic indicators
- Powered by `/api/v1/observations/world` — DB cache snapshot with auto background seed
- Year slider, hover tooltips, color-gradient legend
- Auto-retries on first load while baseline seed runs

#### AI Chart Insight Agent
- Natural language explanation of comparison charts
- Provider-agnostic: Gemini or Groq depending on `CHART_EXPLAIN_PROVIDER` env
- Streamed markdown response

#### Income Analysis page
- Personal salary benchmarking vs country averages
- Inflation-adjusted comparisons (1Y / 3Y / 5Y periods)
- AI-generated career insights (Gemini / Groq)

#### Multi-language support
7 languages: EN, RU, KZ, DE, FR, ZH, ES. Full translation of all UI strings.

#### News section
Live economic headlines, cached server-side.

---

### Outstanding / future work

- [ ] Wire income comparison to live World Bank data (currently uses static `countryIncomeData.js`)
- [ ] Add exchange-rate conversion for income comparison (USD base)
- [ ] Consider ARIMA/ETS forecast model as alternative to linear trend
- [ ] Add CSV export for income comparison table
- [ ] Lazy-load `IncomeComparisonSection` (Chart.js ~200 kB gzipped)
- [ ] Add CI/CD pipeline
- [ ] Production deployment guide (nginx, SSL, env secrets)
