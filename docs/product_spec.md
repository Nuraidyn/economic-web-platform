## Product spec: Economic Web Platform (market-ready)

### Target users

- Students and researchers studying income inequality and macroeconomic indicators.
- Policy analysts who need quick, transparent visualizations (non-production-critical).

### Problems solved

- Fragmented access to inequality metrics (Gini, Lorenz) and macro indicators (GDP, inflation, unemployment).
- Difficulty comparing countries over time with missing data and different indicator scales.
- Lack of transparent forecasting with clear limitations and confidence ranges.

### Core features

- **Auth & roles**: Django-based JWT auth with roles (`user`, `researcher`, `admin`) and mandatory user agreement.
- **Dual backend architecture**:
  - Django for users, agreements, saved presets.
  - FastAPI for catalog, time series, analytics, ingestion, and forecasts.
- **Analytics**:
  - Time-series comparison for multiple countries and indicators.
  - Lorenz curve & Gini index endpoints with caching and missing-data awareness.
  - Inequality trends: Gini series with YoY changes and year-based ranking.
  - Correlation exploration (Pearson) for overlapping time series.
- **Forecasting**:
  - Linear trend model with confidence bands.
  - Simple rolling backtest (MAE/RMSE) reported in API response.
  - Explicit model assumptions and academic disclaimers in UI.
- **Saved sessions**:
  - User-level “analysis presets” stored in Django.
  - Presets contain countries, indicators, chart type, and year range.
- **Exports & transparency**:
  - CSV export for comparisons and forecasts.
  - Download chart as PNG.
  - Data source headers from FastAPI (cache vs World Bank live; fetched-at timestamp).

### UX flows

- **Onboarding**:
  - Land on Dashboard with public comparison controls.
  - Optional registration/login panel and agreement panel in sidebar.
- **Inequality page**:
  - Uses chosen countries and filters from shared analysis context.
  - Loads Gini trends and shows last observed values and data source per country.
- **Forecast page**:
  - Requires accepted agreement and valid JWT.
  - Uses shared country/indicator context, shows backtest metrics and disclaimers.
- **Saved page**:
  - Explains presets; management is done via sidebar “Saved presets” panel.

