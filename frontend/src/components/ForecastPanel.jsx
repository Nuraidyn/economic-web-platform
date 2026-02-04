import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { createForecast, fetchLatestForecast, fetchObservationsWithMeta } from "../api/analyticsApi";

const buildForecastChart = (history, forecast) => {
  const historyPoints = history.map((row) => ({ x: row.year, y: row.value }));
  const forecastPoints = forecast.points.map((row) => ({ x: row.year, y: row.value }));
  const lowerPoints = forecast.points.map((row) => ({ x: row.year, y: row.lower }));
  const upperPoints = forecast.points.map((row) => ({ x: row.year, y: row.upper }));

  return {
    datasets: [
      {
        label: "Historical",
        data: historyPoints,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        tension: 0.2,
      },
      {
        label: "Forecast",
        data: forecastPoints,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251,191,36,0.2)",
        borderDash: [6, 6],
        tension: 0.2,
      },
      {
        label: "Lower bound",
        data: lowerPoints,
        borderColor: "rgba(248,113,113,0.6)",
        backgroundColor: "rgba(248,113,113,0.15)",
        borderDash: [2, 4],
        pointRadius: 0,
      },
      {
        label: "Upper bound",
        data: upperPoints,
        borderColor: "rgba(34,211,238,0.6)",
        backgroundColor: "rgba(34,211,238,0.15)",
        borderDash: [2, 4],
        pointRadius: 0,
      },
    ],
  };
};

const lastValidValue = (series) => {
  const filtered = series.filter((row) => typeof row.value === "number");
  return filtered.length ? filtered[filtered.length - 1] : null;
};

const computeCoverage = (series) => {
  if (!series.length) {
    return null;
  }
  const years = series.map((row) => row.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const expected = maxYear - minYear + 1;
  const actual = series.filter((row) => typeof row.value === "number").length;
  if (expected <= 0) {
    return null;
  }
  return {
    minYear,
    maxYear,
    expected,
    actual,
    percent: Math.round((actual / expected) * 100),
  };
};

const exportForecastCsv = (history, forecast, coverage) => {
  const rows = [
    ["type", "year", "value", "lower", "upper"],
    coverage
      ? [
          "meta",
          "coverage",
          `${coverage.percent}% (${coverage.actual}/${coverage.expected})`,
          coverage.minYear,
          coverage.maxYear,
        ]
      : ["meta", "coverage", "n/a", "", ""],
    ...history.map((row) => ["historical", row.year, row.value, "", ""]),
    ...forecast.points.map((row) => [
      "forecast",
      row.year,
      row.value,
      row.lower ?? "",
      row.upper ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `forecast_${forecast.country}_${forecast.indicator}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ForecastPanel({
  canAccess,
  countries,
  indicators,
  defaultCountry,
  defaultIndicator,
}) {
  const [country, setCountry] = useState(defaultCountry || "");
  const [indicator, setIndicator] = useState(defaultIndicator || "");
  const [horizon, setHorizon] = useState(5);
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const canRun = canAccess && country && indicator;

  const handleForecast = async () => {
    if (!canRun) {
      setStatus({ loading: false, error: "Select a country and indicator." });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const [historyData, forecastData] = await Promise.all([
        fetchObservationsWithMeta({
          country,
          indicator,
          start_year: 1960,
          end_year: new Date().getFullYear(),
        }),
        createForecast({ country, indicator, horizon_years: horizon }),
      ]);
      setHistory(historyData.data);
      setHistoryMeta(historyData.meta);
      setForecast(forecastData);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      setStatus({
        loading: false,
        error: "Unable to generate forecast. Ensure data is ingested and agreement accepted.",
      });
    }
  };

  const handleLatest = async () => {
    if (!canRun) {
      setStatus({ loading: false, error: "Select a country and indicator." });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const [historyData, forecastData] = await Promise.all([
        fetchObservationsWithMeta({
          country,
          indicator,
          start_year: 1960,
          end_year: new Date().getFullYear(),
        }),
        fetchLatestForecast({ country, indicator }),
      ]);
      setHistory(historyData.data);
      setHistoryMeta(historyData.meta);
      setForecast(forecastData);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      setStatus({
        loading: false,
        error: "No saved forecast found for this selection.",
      });
    }
  };

  const chartData = useMemo(() => {
    if (!forecast) {
      return null;
    }
    return buildForecastChart(history, forecast);
  }, [history, forecast]);

  const coverage = useMemo(() => computeCoverage(history), [history]);

  const summary = useMemo(() => {
    if (!forecast) {
      return null;
    }
    const lastHistory = lastValidValue(history);
    const firstForecast = forecast.points[0] || null;
    const lastForecast = forecast.points[forecast.points.length - 1] || null;
    if (!lastHistory || !firstForecast || !lastForecast) {
      return null;
    }
    const absoluteChange = lastForecast.value - lastHistory.value;
    const percentChange =
      lastHistory.value !== 0 ? (absoluteChange / lastHistory.value) * 100 : null;
    const avgAnnualChange = absoluteChange / forecast.horizon_years;
    return {
      lastHistory,
      firstForecast,
      lastForecast,
      absoluteChange,
      percentChange,
      avgAnnualChange,
    };
  }, [history, forecast]);

  return (
    <section className="panel-wide">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="panel-title">Forecasting Studio</h3>
          <p className="text-sm text-slate-200/80 mt-2 max-w-2xl">
            Forecasts are probabilistic, not guaranteed. Use them for academic exploration and
            scenario comparison rather than direct policy decisions.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
          Predictions only
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="rounded-2xl border border-slate-100/10 bg-slate-900/50 p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                Country
              </label>
              <select
                className="input"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="">Select country</option>
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                Indicator
              </label>
              <select
                className="input"
                value={indicator}
                onChange={(event) => setIndicator(event.target.value)}
              >
                <option value="">Select indicator</option>
                {indicators.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label || item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                Horizon (years)
              </label>
              <input
                className="input"
                type="number"
                min="1"
                max="20"
                value={horizon}
                onChange={(event) => setHorizon(Number(event.target.value))}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                className="btn-primary"
                type="button"
                onClick={handleForecast}
                disabled={!canAccess}
              >
                {status.loading ? "Running..." : "Generate"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={handleLatest}
                disabled={!canAccess}
              >
                Latest run
              </button>
            </div>
          </div>
          {status.error && <p className="text-xs text-rose-200/90">{status.error}</p>}
          {!canAccess && (
            <p className="text-xs text-amber-200/80">
              Accept the active user agreement to unlock forecasting endpoints.
            </p>
          )}
          {coverage && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/80">
              <span className="uppercase tracking-[0.2em] text-slate-300/70">Data quality</span>
              <span className="rounded-full border border-slate-100/20 px-3 py-1">
                Coverage {coverage.percent}% ({coverage.actual}/{coverage.expected})
              </span>
              {historyMeta?.source && (
                <span className="rounded-full border border-slate-100/20 px-3 py-1">
                  Source {historyMeta.source}
                </span>
              )}
              {coverage.percent < 60 && (
                <span className="rounded-full border border-rose-200/40 bg-rose-500/20 px-3 py-1 text-rose-100">
                  Low coverage
                </span>
              )}
              <span className="text-[11px] text-slate-300/70">
                {coverage.minYear}–{coverage.maxYear}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200/30 bg-amber-200/10 p-4 text-sm text-amber-50">
          <p className="font-semibold mb-2">Academic disclaimer</p>
          <p className="leading-relaxed">
            Forecasts are generated from historical indicators (Gini, GDP, inflation, employment)
            and reflect model assumptions. The platform is not responsible for decisions based on
            predicted values.
          </p>
          {forecast && (
            <div className="mt-4 text-xs text-amber-100/80 space-y-1">
              <p>Model: {forecast.model_name}</p>
              <p>Assumptions: {forecast.assumptions}</p>
              <p>Metrics: {forecast.metrics}</p>
            </div>
          )}
        </div>
      </div>

      {forecast && summary && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100/15 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Baseline</p>
            <p className="text-xl font-semibold text-white mt-2">
              {summary.lastHistory.value.toFixed(2)}
            </p>
            <p className="text-xs text-slate-200/70">Last historical value</p>
          </div>
          <div className="rounded-2xl border border-slate-100/15 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Change</p>
            <p className="text-xl font-semibold text-white mt-2">
              {summary.absoluteChange.toFixed(2)}
            </p>
            <p className="text-xs text-slate-200/70">
              Avg annual: {summary.avgAnnualChange.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100/15 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Percent</p>
            <p className="text-xl font-semibold text-white mt-2">
              {summary.percentChange == null ? "n/a" : `${summary.percentChange.toFixed(2)}%`}
            </p>
            <p className="text-xs text-slate-200/70">Horizon total shift</p>
          </div>
        </div>
      )}

      {forecast && chartData && (
        <div className="mt-6 chart-card">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom", labels: { color: "#e2e8f0" } } },
              scales: {
                x: { ticks: { color: "#e2e8f0" }, grid: { color: "rgba(148,163,184,0.2)" } },
                y: { ticks: { color: "#e2e8f0" }, grid: { color: "rgba(148,163,184,0.2)" } },
              },
            }}
          />
        </div>
      )}

      {forecast && (
        <div className="mt-4 flex items-center justify-end">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => exportForecastCsv(history, forecast, coverage)}
          >
            Export CSV
          </button>
        </div>
      )}
    </section>
  );
}
