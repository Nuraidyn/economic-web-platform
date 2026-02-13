import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { createForecast, fetchLatestForecast, fetchObservationsWithMeta } from "../api/analyticsApi";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

const FORECAST_HISTORY_WINDOW_YEARS = 20;

const getCssVar = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const buildForecastChart = (history, forecast, labels) => {
  const sortByYear = (left, right) => left.x - right.x;
  const historyPoints = history
    .filter((row) => typeof row.year === "number" && typeof row.value === "number")
    .map((row) => ({ x: row.year, y: row.value }))
    .sort(sortByYear);
  const forecastPoints = forecast.points
    .filter((row) => typeof row.year === "number" && typeof row.value === "number")
    .map((row) => ({ x: row.year, y: row.value }))
    .sort(sortByYear);
  const lowerPoints = forecast.points
    .filter((row) => typeof row.year === "number" && typeof row.lower === "number")
    .map((row) => ({ x: row.year, y: row.lower }))
    .sort(sortByYear);
  const upperPoints = forecast.points
    .filter((row) => typeof row.year === "number" && typeof row.upper === "number")
    .map((row) => ({ x: row.year, y: row.upper }))
    .sort(sortByYear);

  return {
    datasets: [
      {
        label: labels.historical,
        data: historyPoints,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        tension: 0.2,
      },
      {
        label: labels.forecast,
        data: forecastPoints,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251,191,36,0.2)",
        borderDash: [6, 6],
        tension: 0.2,
      },
      {
        label: labels.lowerBound,
        data: lowerPoints,
        borderColor: "rgba(248,113,113,0.6)",
        backgroundColor: "rgba(248,113,113,0.15)",
        borderDash: [2, 4],
        pointRadius: 0,
      },
      {
        label: labels.upperBound,
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
  const { theme } = useTheme();
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const historyStartYear = Math.max(1990, currentYear - FORECAST_HISTORY_WINDOW_YEARS);
  const historyEndYear = Math.max(1990, currentYear - 1);
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
      setStatus({ loading: false, error: t("forecast.errorSelect") });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const [historyData, forecastData] = await Promise.all([
        fetchObservationsWithMeta({
          country,
          indicator,
          start_year: historyStartYear,
          end_year: historyEndYear,
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
        error: t("forecast.errorGenerate"),
      });
    }
  };

  const handleLatest = async () => {
    if (!canRun) {
      setStatus({ loading: false, error: t("forecast.errorSelect") });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const historyData = await fetchObservationsWithMeta({
        country,
        indicator,
        start_year: historyStartYear,
        end_year: historyEndYear,
      });

      let forecastData = await fetchLatestForecast({ country, indicator });
      const assumptions = String(forecastData?.assumptions || "").toLowerCase();
      // Legacy runs (without robust preprocessing) can produce extreme, misleading values.
      if (!assumptions.includes("winsorized")) {
        forecastData = await createForecast({ country, indicator, horizon_years: horizon });
      }

      setHistory(historyData.data);
      setHistoryMeta(historyData.meta);
      setForecast(forecastData);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      setStatus({
        loading: false,
        error: t("forecast.errorLatest"),
      });
    }
  };

  const chartData = useMemo(() => {
    if (!forecast) {
      return null;
    }
    return buildForecastChart(history, forecast, {
      historical: t("forecast.chartHistorical"),
      forecast: t("forecast.chartForecast"),
      lowerBound: t("forecast.chartLower"),
      upperBound: t("forecast.chartUpper"),
    });
  }, [history, forecast, t]);

  const coverage = useMemo(() => computeCoverage(history), [history]);
  const axisColor = useMemo(() => getCssVar("--chart-axis", "#e2e8f0"), [theme]);
  const gridColor = useMemo(() => getCssVar("--chart-grid", "rgba(148,163,184,0.2)"), [theme]);

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
          <h3 className="panel-title">{t("forecast.title")}</h3>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            {t("forecast.subtitle")}
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-200/80">
          {t("forecast.predictionsOnly")}
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="surface p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t("forecast.country")}</label>
              <select
                className="input"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="">{t("forecast.selectCountry")}</option>
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("forecast.indicator")}</label>
              <select
                className="input"
                value={indicator}
                onChange={(event) => setIndicator(event.target.value)}
              >
                <option value="">{t("forecast.selectIndicator")}</option>
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
              <label className="label">{t("forecast.horizon")}</label>
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
                {status.loading ? t("forecast.running") : t("forecast.generate")}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={handleLatest}
                disabled={!canAccess}
              >
                {t("forecast.latestRun")}
              </button>
            </div>
          </div>
          {status.error && <p className="text-xs text-rose-200/90">{status.error}</p>}
          {!canAccess && (
            <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
              {t("forecast.needAgreement")}
            </p>
          )}
          {coverage && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="uppercase tracking-[0.2em] text-faint">{t("forecast.dataQuality")}</span>
              <span className="rounded-full border border-slate-900/10 dark:border-slate-100/20 px-3 py-1">
                {t("forecast.coverage", {
                  percent: coverage.percent,
                  actual: coverage.actual,
                  expected: coverage.expected,
                })}
              </span>
              {historyMeta?.source && (
                <span className="rounded-full border border-slate-900/10 dark:border-slate-100/20 px-3 py-1">
                  {t("forecast.source", { source: historyMeta.source })}
                </span>
              )}
              {coverage.percent < 60 && (
                <span className="rounded-full border border-rose-200/40 bg-rose-500/20 px-3 py-1 text-rose-100">
                  {t("forecast.lowCoverage")}
                </span>
              )}
              <span className="text-[11px] text-faint">
                {coverage.minYear}–{coverage.maxYear}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-300/45 bg-amber-100/55 dark:border-amber-200/30 dark:bg-amber-200/10 p-4 text-sm text-amber-900 dark:text-amber-50">
          <p className="font-semibold mb-2">{t("forecast.disclaimerTitle")}</p>
          <p className="leading-relaxed">
            {t("forecast.disclaimerText")}
          </p>
          {forecast && (
            <div className="mt-4 text-xs text-amber-900/80 dark:text-amber-100/80 space-y-1">
              <p>{t("forecast.model", { value: forecast.model_name })}</p>
              <p>{t("forecast.assumptions", { value: forecast.assumptions })}</p>
              <p>{t("forecast.metrics", { value: forecast.metrics })}</p>
            </div>
          )}
        </div>
      </div>

      {forecast && summary && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">{t("forecast.baseline")}</p>
            <p className="text-xl font-semibold mt-2">
              {summary.lastHistory.value.toFixed(2)}
            </p>
            <p className="text-xs text-muted">{t("forecast.lastHistorical")}</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">{t("forecast.change")}</p>
            <p className="text-xl font-semibold mt-2">
              {summary.absoluteChange.toFixed(2)}
            </p>
            <p className="text-xs text-muted">
              {t("forecast.avgAnnual", { value: summary.avgAnnualChange.toFixed(2) })}
            </p>
          </div>
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">{t("forecast.percent")}</p>
            <p className="text-xl font-semibold mt-2">
              {summary.percentChange == null ? t("common.na") : `${summary.percentChange.toFixed(2)}%`}
            </p>
            <p className="text-xs text-muted">{t("forecast.horizonShift")}</p>
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
              plugins: { legend: { position: "bottom", labels: { color: axisColor } } },
              scales: {
                x: {
                  type: "linear",
                  ticks: { color: axisColor, precision: 0 },
                  title: { display: true, text: t("chart.year"), color: axisColor },
                  grid: { color: gridColor },
                },
                y: {
                  ticks: { color: axisColor },
                  title: { display: true, text: t("chart.value"), color: axisColor },
                  grid: { color: gridColor },
                },
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
            {t("comparison.exportCsv")}
          </button>
        </div>
      )}
    </section>
  );
}
