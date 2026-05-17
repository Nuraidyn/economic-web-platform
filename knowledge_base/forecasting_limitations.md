# Forecasting Limitations

## Why Forecasts Fail
Economic forecasts are inherently uncertain because:
- Economies are complex adaptive systems with feedback loops.
- Human behavior changes in response to forecasts (self-fulfilling/defeating prophecies).
- Structural breaks (crises, wars, pandemics) are impossible to predict from historical data.
- Data used to build models is revised after the fact.

## Types of Uncertainty
- **Parameter uncertainty**: model coefficients are estimated from limited data.
- **Model uncertainty**: the true model of the economy is unknown.
- **Scenario uncertainty**: future policy decisions and exogenous shocks are unknown.

## Confidence Intervals
Forecasts should always be presented with confidence intervals. A 95% confidence interval means: if the model is correct and we repeated the forecast many times, 95% of intervals would contain the true value. Intervals widen rapidly over the forecast horizon.

## Black Swans
Rare, high-impact events (financial crises, pandemics, wars) that lie outside normal model assumptions. No statistical model trained on past data can reliably predict them. This is why point forecasts 5+ years out are almost always wrong in magnitude.

## Model Assumptions
Time-series models (ARIMA, exponential smoothing) assume:
- The future will resemble the past (stationarity).
- Relationships between variables are stable.
- No structural breaks in the data.

These assumptions frequently fail in practice.

## How to Use Forecasts
- Use forecasts to understand likely direction, not precise magnitude.
- Use multiple models and scenarios rather than a single point forecast.
- Assign higher credibility to near-term forecasts (1-2 years) than long-term ones (5+ years).
- Always check forecast track record for the specific model and data source.
