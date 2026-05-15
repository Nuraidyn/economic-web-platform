## Product spec: EVision — Macroeconomic Intelligence Platform

### Target users

- Students and researchers studying income inequality and macroeconomic indicators
- Policy analysts who need quick, transparent visualizations
- Individuals benchmarking personal salary against country averages

### Problems solved

- Fragmented access to inequality metrics (Gini, Lorenz) and macro indicators (GDP, inflation, unemployment)
- Difficulty comparing countries over time with missing data and different indicator scales
- No accessible world map showing economic indicators at a glance
- Lack of transparent forecasting with clear limitations and confidence ranges
- No tool for personal salary benchmarking against global averages with inflation adjustment

---

### Implemented features

#### Auth & roles
- Django-based JWT auth (SimpleJWT) with roles: `user`, `researcher`, `admin`
- Mandatory user agreement enforcement (server-side via FastAPI introspection)
- Silent token refresh (httpOnly refresh cookie, 401 interceptor)
- Google OAuth login
- Email verification, password reset flows

#### Multi-language support
7 fully translated languages: English, Russian, Kazakh, German, French, Chinese, Spanish. Language preference persisted in localStorage.

#### Compare page (`/compare`)
- Multi-country × multi-indicator time-series comparison (up to 4 countries, 4 indicators)
- Chart types: line, bar, scatter
- Year range selector (1990–present)
- Pearson correlation table for two selected indicators
- Export: CSV per indicator, PNG chart download
- Timeframe filter chips (5Y / 10Y / 20Y / All)
- Saved presets (server-side, requires login)

#### World map (on `/compare`)
- Choropleth map of 180+ countries colored by economic indicator
- Indicators: GDP per capita, GDP total, Inflation, Unemployment, Gini, GDP growth, Poverty
- Year slider to explore historical snapshots
- Hover tooltip with country name and value
- Auto-seeds baseline country data on first load (polling retry)

#### Income Analysis page (`/income-analysis`)
- Personal salary form: monthly income, country, occupation, experience
- Benchmarks salary against country averages (nominal and inflation-adjusted)
- Period toggle: 1Y / 3Y / 5Y
- Inflation adjustment toggle
- Bar chart comparing up to 6 countries
- KPI cards: salary gap, cumulative inflation, real income, best benchmark country
- AI-generated insights (Gemini / Groq)

#### Forecasting page (`/forecast`)
- Linear trend forecast with configurable horizon (1–10 years)
- Confidence bands (95%)
- Backtest metrics: MAE, RMSE (rolling origin)
- Clear academic disclaimers and model assumptions in UI
- Requires accepted user agreement + JWT

#### AI Chart Insight Agent
- Explains any comparison chart in natural language
- Uses Gemini or Groq depending on env config
- Streamed response with formatted markdown output

#### News section (on Home landing page)
- Live economic news headlines
- Cached server-side to reduce upstream API calls

#### Saved Presets
- Save/load analysis configurations (countries, indicators, chart type, year range)
- Stored server-side per user (requires login)
- Accessible via sidebar drawer on `/compare`

#### Landing page (`/`)
- Scroll-reveal animated sections
- Feature grid, how-it-works, AI insight preview, analytics preview, CTA

---

### UX flows

**Onboarding**
1. Land on `/` with animated landing page
2. Sign in / register via navbar or modal
3. Accept user agreement (required for advanced features)

**Compare page**
1. Select countries and indicators in multi-selects
2. Set chart type and year range
3. Click "Run comparison" → charts + correlation table
4. Scroll down → world map auto-colored for selected indicator
5. Optionally: click AI Insight → natural language chart analysis

**Income Analysis**
1. Fill in monthly salary, currency, country, occupation
2. Submit → salary benchmarked against country data
3. Toggle period / inflation adjustment
4. Read AI-generated career insights

**Forecast**
1. Accept agreement if not done (gated)
2. Select country + indicator
3. Set forecast horizon
4. View forecast chart with confidence bands and backtest metrics

**Saved Presets**
1. Configure analysis on `/compare`
2. Click "Saved presets" in action bar → open drawer
3. Save current config or load a previous one

---

### Data sources

- **World Bank API** — primary source for all observations (GDP, inflation, unemployment, Gini, poverty, etc.)
- Observations cached in PostgreSQL; live World Bank fetch on cache miss
- **Baseline seed**: 48 countries × 10 indicators auto-seeded on FastAPI startup

---

### Known limitations

- Income comparison uses static `countryIncomeData.js` for averages; not yet wired to live World Bank data
- World map only shows indicators cached in DB (auto-seeded on first use, may take ~2 minutes on fresh install)
- Forecast model is linear trend only; no ARIMA/ETS
