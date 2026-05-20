import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { createForecast, fetchLatestForecast, fetchObservationsWithMeta } from "../api/analyticsApi";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

ChartJS;

/* ── Quick-pick chips ──────────────────────────────────────────────────────── */
const QUICK_COUNTRIES = ["US", "DE", "GB", "CN", "JP", "KZ", "FR", "IN"];
const QUICK_INDICATORS = [
  "NY.GDP.MKTP.KD.ZG",
  "FP.CPI.TOTL.ZG",
  "SL.UEM.TOTL.ZS",
  "NE.EXP.GNFS.ZS",
  "SP.POP.TOTL",
];

/* ── History window options ────────────────────────────────────────────────── */
const HISTORY_WINDOWS = { "10Y": 10, "20Y": 20, All: 60 };

/* ── Chart helpers ─────────────────────────────────────────────────────────── */
const buildForecastChart = (history, forecast, labels) => {
  const sortByYear = (a, b) => a.x - b.x;

  const historyPoints = history
    .filter((r) => typeof r.year === "number" && typeof r.value === "number")
    .map((r) => ({ x: r.year, y: r.value }))
    .sort(sortByYear);

  const forecastPoints = forecast.points
    .filter((r) => typeof r.year === "number" && typeof r.value === "number")
    .map((r) => ({ x: r.year, y: r.value }))
    .sort(sortByYear);

  const lowerPoints = forecast.points
    .filter((r) => typeof r.year === "number" && typeof r.lower === "number")
    .map((r) => ({ x: r.year, y: r.lower }))
    .sort(sortByYear);

  const upperPoints = forecast.points
    .filter((r) => typeof r.year === "number" && typeof r.upper === "number")
    .map((r) => ({ x: r.year, y: r.upper }))
    .sort(sortByYear);

  return {
    datasets: [
      {
        label: labels.historical,
        data: historyPoints,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.15)",
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 5,
        order: 1,
      },
      {
        label: labels.forecast,
        data: forecastPoints,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251,191,36,0.15)",
        borderDash: [6, 4],
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 5,
        order: 2,
      },
      /* Lower bound — fill toward next dataset (upper) */
      {
        label: labels.lowerBound,
        data: lowerPoints,
        borderColor: "rgba(251,191,36,0.22)",
        backgroundColor: "rgba(251,191,36,0.08)",
        borderDash: [2, 4],
        pointRadius: 0,
        tension: 0.1,
        fill: "+1",
        order: 3,
      },
      /* Upper bound — no fill */
      {
        label: labels.upperBound,
        data: upperPoints,
        borderColor: "rgba(251,191,36,0.22)",
        backgroundColor: "transparent",
        borderDash: [2, 4],
        pointRadius: 0,
        tension: 0.1,
        fill: false,
        order: 4,
      },
    ],
  };
};

const lastValidValue = (series) => {
  const filtered = series.filter((r) => typeof r.value === "number");
  return filtered.length ? filtered[filtered.length - 1] : null;
};

const computeCoverage = (series) => {
  if (!series.length) return null;
  const years = series.map((r) => r.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const expected = maxYear - minYear + 1;
  const actual = series.filter((r) => typeof r.value === "number").length;
  if (expected <= 0) return null;
  return { minYear, maxYear, expected, actual, percent: Math.round((actual / expected) * 100) };
};

const exportForecastCsv = (history, forecast, coverage) => {
  const rows = [
    ["type", "year", "value", "lower", "upper"],
    coverage
      ? ["meta", "coverage", `${coverage.percent}% (${coverage.actual}/${coverage.expected})`, coverage.minYear, coverage.maxYear]
      : ["meta", "coverage", "n/a", "", ""],
    ...history.map((r) => ["historical", r.year, r.value, "", ""]),
    ...forecast.points.map((r) => ["forecast", r.year, r.value, r.lower ?? "", r.upper ?? ""]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `forecast_${forecast.country}_${forecast.indicator}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const parseForecastMetrics = (metrics) => {
  if (!metrics) return null;
  try {
    const md = JSON.parse(metrics);
    return {
      rmse: md.rmse != null ? Number(md.rmse).toFixed(4) : null,
      mae: md.mae != null ? Number(md.mae).toFixed(4) : null,
    };
  } catch {
    return { raw: metrics };
  }
};

const TREND_STYLES = {
  increasing: "text-emerald-700 dark:text-emerald-300",
  decreasing: "text-rose-700 dark:text-rose-300",
  stable: "text-slate-500 dark:text-slate-400",
};

/* ── SearchableSelect ──────────────────────────────────────────────────────── */
/**
 * options: [{ value: string, label: string }]
 * value:   currently selected value (code)
 * onChange: (newValue: string) => void
 */
function SearchableSelect({ id, options, value, onChange, placeholder, maxResults = 9 }) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const containerRef = useRef(null);

  /* Sync when parent clears or changes value externally */
  useEffect(() => {
    const s = options.find((o) => o.value === value);
    setQuery(s?.label || "");
  }, [value, options]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (q.length >= 1) {
      setFiltered(
        options
          .filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
          .slice(0, maxResults)
      );
      setOpen(true);
    } else {
      setFiltered(options.slice(0, maxResults));
      setOpen(true);
      onChange("");
    }
  }

  function handleFocus() {
    if (!query) {
      setFiltered(options.slice(0, maxResults));
      setOpen(true);
    } else if (filtered.length > 0) {
      setOpen(true);
    }
  }

  function handleSelect(opt) {
    setQuery(opt.label);
    setOpen(false);
    onChange(opt.value);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      /* If typed text doesn't match any option, restore previous selection */
      const match = options.find(
        (o) => o.label.toLowerCase() === query.toLowerCase()
      );
      if (!match) {
        const existing = options.find((o) => o.value === value);
        setQuery(existing?.label || "");
      }
    }, 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        className="input mt-1 w-full"
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border border-[var(--panel-border-strong)] bg-[var(--modal-surface)] shadow-xl max-h-56 overflow-y-auto"
          role="listbox"
        >
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                opt.value === value
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "hover:bg-[var(--surface)]"
              }`}
              onMouseDown={() => handleSelect(opt)}
            >
              <span className="font-mono text-[10px] text-faint mr-2">{opt.value}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Quick chip row ────────────────────────────────────────────────────────── */
function QuickChips({ items, active, onSelect, labelMap }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          className={active === v ? "tab-active" : "tab"}
          style={{ fontSize: "11px", padding: "2px 8px" }}
        >
          {labelMap?.[v] || v}
        </button>
      ))}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function ForecastPanel({
  canAccess,
  countries,
  indicators,
  defaultCountry,
  defaultIndicator,
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const currentYear = new Date().getFullYear();

  const [country, setCountry] = useState(defaultCountry || "");
  const [indicator, setIndicator] = useState(defaultIndicator || "");
  const [horizon, setHorizon] = useState(5);
  const [historyWindow, setHistoryWindow] = useState("20Y");
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [showModelComparison, setShowModelComparison] = useState(false);
  const abortRef = useRef(null);

  const historyYears = HISTORY_WINDOWS[historyWindow] ?? 20;
  const historyStartYear = Math.max(1960, currentYear - historyYears);
  const historyEndYear = Math.max(1960, currentYear - 1);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /* Rebuild country + indicator option lists for SearchableSelect */
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.code, label: c.name })),
    [countries]
  );
  const indicatorOptions = useMemo(
    () => indicators.map((i) => ({ value: i.code, label: i.label || i.name })),
    [indicators]
  );

  /* Quick-chip label maps */
  const countryLabelMap = useMemo(
    () => Object.fromEntries(countries.map((c) => [c.code, c.name])),
    [countries]
  );
  const indicatorLabelMap = useMemo(
    () => Object.fromEntries(indicators.map((i) => [i.code, i.label || i.name])),
    [indicators]
  );

  const canRun = canAccess && country && indicator;

  const runForecast = async (useLatest = false) => {
    if (!canRun) {
      setStatus({ loading: false, error: t("forecast.errorSelect") });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setStatus({ loading: true, error: "" });
    setShowModelComparison(false);
    try {
      const [historyData, forecastData] = await Promise.all([
        fetchObservationsWithMeta(
          { country, indicator, start_year: historyStartYear, end_year: historyEndYear },
          signal
        ),
        useLatest
          ? fetchLatestForecast({ country, indicator }, signal).then(async (fd) => {
              const assumptions = String(fd?.assumptions || "").toLowerCase();
              if (!assumptions.includes("winsorized") && !assumptions.includes("smoothing") && !assumptions.includes("holt")) {
                return createForecast({ country, indicator, horizon_years: horizon }, signal);
              }
              return fd;
            })
          : createForecast({ country, indicator, horizon_years: horizon }, signal),
      ]);
      if (signal.aborted) return;
      setHistory(historyData.data);
      setHistoryMeta(historyData.meta);
      setForecast(forecastData);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      if (signal.aborted) return;
      setStatus({
        loading: false,
        error: useLatest ? t("forecast.errorLatest") : t("forecast.errorGenerate"),
      });
    }
  };

  /* ── Derived values ── */
  const chartData = useMemo(() => {
    if (!forecast) return null;
    return buildForecastChart(history, forecast, {
      historical: t("forecast.chartHistorical"),
      forecast: t("forecast.chartForecast"),
      lowerBound: t("forecast.chartLower"),
      upperBound: t("forecast.chartUpper"),
    });
  }, [history, forecast, t]);

  const coverage = useMemo(() => computeCoverage(history), [history]);
  const axisColor = isDark ? "rgba(226,232,240,0.7)" : "rgba(15,23,42,0.66)";
  const gridColor = isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.12)";

  const summary = useMemo(() => {
    if (!forecast) return null;
    const lastHistory = lastValidValue(history);
    const firstForecast = forecast.points[0] || null;
    const lastForecast = forecast.points[forecast.points.length - 1] || null;
    if (!lastHistory || !firstForecast || !lastForecast) return null;
    const absoluteChange = lastForecast.value - lastHistory.value;
    const percentChange =
      lastHistory.value !== 0 ? (absoluteChange / lastHistory.value) * 100 : null;
    return {
      lastHistory,
      firstForecast,
      lastForecast,
      absoluteChange,
      percentChange,
      avgAnnualChange: absoluteChange / forecast.horizon_years,
    };
  }, [history, forecast]);

  const parsedMetrics = useMemo(
    () => parseForecastMetrics(forecast?.metrics),
    [forecast]
  );

  const stat = forecast?.statistical_summary ?? null;
  const trendDir = forecast?.trend_direction ?? null;
  const trendKey =
    trendDir === "increasing"
      ? "forecast.trendIncreasing"
      : trendDir === "decreasing"
      ? "forecast.trendDecreasing"
      : "forecast.trendStable";
  const trendClass = TREND_STYLES[trendDir] || TREND_STYLES.stable;
  const anomalyYears = forecast?.anomaly_years ?? [];
  const modelComparison = forecast?.model_comparison ?? [];
  const confidenceScore = forecast?.confidence_score ?? null;

  /* Year where historical ends and forecast begins */
  const forecastStartYear = forecast?.points?.[0]?.year ?? null;

  /* Inline vertical-line plugin for Chart.js */
  const verticalLinePlugin = useMemo(
    () => ({
      id: "forecastStartLine",
      beforeDraw(chart) {
        if (!forecastStartYear) return;
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        if (!xScale || !chartArea) return;
        const x = xScale.getPixelForValue(forecastStartYear);
        if (x < chartArea.left || x > chartArea.right) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.strokeStyle = isDark
          ? "rgba(251,191,36,0.40)"
          : "rgba(180,130,0,0.35)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.restore();
      },
    }),
    [forecastStartYear, isDark]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: axisColor, boxWidth: 12, padding: 16, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            title: (items) => `${t("chart.year")} ${items[0]?.label}`,
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          ticks: { color: axisColor, precision: 0, font: { size: 11 } },
          title: { display: true, text: t("chart.year"), color: axisColor },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: axisColor, font: { size: 11 } },
          title: { display: true, text: t("chart.value"), color: axisColor },
          grid: { color: gridColor },
        },
      },
    }),
    [axisColor, gridColor, t]
  );

  const fmtPct = (v) =>
    v != null ? `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "—";
  const fmtNum = (v, digits = 4) =>
    v != null ? Number(v).toFixed(digits) : "—";

  /* ── Render ── */
  return (
    <section className="panel-wide">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="panel-title">{t("forecast.title")}</h3>
          <p className="text-sm text-muted mt-2 max-w-2xl">{t("forecast.subtitle")}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-200/80 shrink-0">
          {t("forecast.predictionsOnly")}
        </div>
      </div>

      {/* ── Controls + Disclaimer ── */}
      <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Controls */}
        <div className="surface p-4 space-y-4">
          {/* Country + Indicator */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="label" htmlFor="fp-country">
                {t("forecast.country")}
              </label>
              <SearchableSelect
                id="fp-country"
                options={countryOptions}
                value={country}
                onChange={setCountry}
                placeholder={t("forecast.selectCountry")}
              />
              {countryOptions.length > 0 && (
                <QuickChips
                  items={QUICK_COUNTRIES.filter((c) =>
                    countryOptions.some((o) => o.value === c)
                  )}
                  active={country}
                  onSelect={setCountry}
                  labelMap={countryLabelMap}
                />
              )}
            </div>

            {/* Indicator */}
            <div>
              <label className="label" htmlFor="fp-indicator">
                {t("forecast.indicator")}
              </label>
              <SearchableSelect
                id="fp-indicator"
                options={indicatorOptions}
                value={indicator}
                onChange={setIndicator}
                placeholder={t("forecast.selectIndicator")}
              />
              {indicatorOptions.length > 0 && (
                <QuickChips
                  items={QUICK_INDICATORS.filter((c) =>
                    indicatorOptions.some((o) => o.value === c)
                  )}
                  active={indicator}
                  onSelect={setIndicator}
                  labelMap={indicatorLabelMap}
                />
              )}
            </div>
          </div>

          {/* Horizon slider + History window + Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Horizon */}
            <div>
              <label className="label">
                {t("forecast.horizon")}
                <span className="ml-2 font-semibold text-[var(--accent)]">
                  {horizon}Y
                </span>
              </label>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-faint">1</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)] cursor-pointer"
                />
                <span className="text-xs text-faint">20</span>
              </div>
            </div>

            {/* History window + Buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="label whitespace-nowrap">{t("forecast.historyWindow")}</span>
                <div className="flex gap-1">
                  {Object.keys(HISTORY_WINDOWS).map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={historyWindow === w ? "tab-active" : "tab"}
                      onClick={() => setHistoryWindow(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => runForecast(false)}
                  disabled={!canAccess || status.loading}
                >
                  {status.loading ? t("forecast.running") : t("forecast.generate")}
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => runForecast(true)}
                  disabled={!canAccess || status.loading}
                >
                  {t("forecast.latestRun")}
                </button>
              </div>
            </div>
          </div>

          {/* Errors / warnings */}
          {status.error && (
            <p className="text-xs text-rose-200/90">{status.error}</p>
          )}
          {!canAccess && (
            <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
              {t("forecast.needAgreement")}
            </p>
          )}

          {/* Data quality */}
          {coverage && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="uppercase tracking-[0.2em] text-faint">
                {t("forecast.dataQuality")}
              </span>
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

        {/* Disclaimer + model info */}
        <div className="rounded-2xl border border-amber-300/45 bg-amber-100/55 dark:border-amber-200/30 dark:bg-amber-200/10 p-4 text-sm text-amber-900 dark:text-amber-50">
          <p className="font-semibold mb-2">{t("forecast.disclaimerTitle")}</p>
          <p className="leading-relaxed">{t("forecast.disclaimerText")}</p>
          {forecast && (
            <div className="mt-4 text-xs text-amber-900/80 dark:text-amber-100/80 space-y-1.5">
              <p>{t("forecast.model", { value: forecast.model_name })}</p>
              {forecast.assumptions && (
                <p className="leading-relaxed">
                  {t("forecast.assumptions", { value: forecast.assumptions })}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                {confidenceScore != null && (
                  <span className="flex items-center gap-1">
                    <span className="text-faint">{t("forecast.confidenceScore")}:</span>
                    <span className="font-semibold">
                      {(confidenceScore * 100).toFixed(1)}%
                    </span>
                  </span>
                )}
                {trendDir && (
                  <span className="flex items-center gap-1">
                    <span className="text-faint">{t("forecast.trendLabel")}:</span>
                    <span className={`font-semibold ${trendClass}`}>{t(trendKey)}</span>
                  </span>
                )}
                {parsedMetrics?.rmse && (
                  <span className="flex items-center gap-1">
                    <span className="text-faint">{t("forecast.rmseLabel")}:</span>
                    <span className="font-mono">{parsedMetrics.rmse}</span>
                  </span>
                )}
                {parsedMetrics?.mae && (
                  <span className="flex items-center gap-1">
                    <span className="text-faint">{t("forecast.maeLabel")}:</span>
                    <span className="font-mono">{parsedMetrics.mae}</span>
                  </span>
                )}
                {parsedMetrics?.raw && (
                  <span className="text-faint">{parsedMetrics.raw}</span>
                )}
              </div>
              {anomalyYears.length > 0 && (
                <p className="mt-2 rounded border border-amber-400/40 bg-amber-300/20 px-2 py-1 text-amber-900 dark:text-amber-100">
                  ⚠ {t("forecast.anomalyWarning", { years: anomalyYears.join(", ") })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      {forecast && summary && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">
              {t("forecast.baseline")}
            </p>
            <p className="text-xl font-semibold mt-2">
              {summary.lastHistory.value.toFixed(2)}
            </p>
            <p className="text-xs text-muted">{t("forecast.lastHistorical")}</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">
              {t("forecast.change")}
            </p>
            <p className="text-xl font-semibold mt-2">
              {summary.absoluteChange.toFixed(2)}
            </p>
            <p className="text-xs text-muted">
              {t("forecast.avgAnnual", {
                value: summary.avgAnnualChange.toFixed(2),
              })}
            </p>
          </div>
          <div className="surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-faint">
              {t("forecast.percent")}
            </p>
            <p className="text-xl font-semibold mt-2">
              {summary.percentChange == null
                ? "—"
                : `${summary.percentChange.toFixed(2)}%`}
            </p>
            <p className="text-xs text-muted">{t("forecast.horizonShift")}</p>
          </div>
        </div>
      )}

      {/* ── Statistical Analysis ── */}
      {forecast && stat && (
        <div className="mt-4 surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-faint mb-3">
            {t("forecast.statsTitle")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">{t("forecast.cagrLabel")}</p>
              <p className="font-semibold mt-0.5">{fmtPct(stat.cagr_pct)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("forecast.avgYoyLabel")}</p>
              <p className="font-semibold mt-0.5">{fmtPct(stat.avg_yoy_growth_pct)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("forecast.volatilityLabel")}</p>
              <p className="font-semibold mt-0.5">{fmtNum(stat.volatility_cv)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("forecast.totalChangeLabel")}</p>
              <p className="font-semibold mt-0.5">{fmtPct(stat.pct_change_total)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            {stat.year_range && (
              <span>
                {t("forecast.dataRange")}:{" "}
                <span className="font-mono">{stat.year_range}</span>
              </span>
            )}
            {stat.data_points != null && (
              <span>
                <span className="font-mono">{stat.data_points}</span>{" "}
                {t("forecast.dataPoints")}
              </span>
            )}
            {stat.mean != null && (
              <span>
                μ = <span className="font-mono">{fmtNum(stat.mean, 2)}</span>
              </span>
            )}
            {stat.std != null && (
              <span>
                σ = <span className="font-mono">{fmtNum(stat.std, 2)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Chart / Loading skeleton / Empty state ── */}
      {status.loading ? (
        /* Loading skeleton */
        <div
          className="mt-6 chart-card flex flex-col items-center justify-center gap-3"
          style={{ minHeight: "18rem" }}
        >
          <div
            style={{
              width: "2.5rem", height: "2.5rem",
              border: "2px solid var(--panel-border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-xs text-muted">{t("forecast.running")}</p>
        </div>
      ) : forecast && chartData ? (
        <>
          {/* Forecast start label */}
          {forecastStartYear && (
            <p className="mt-4 text-[11px] text-faint text-right">
              {t("forecast.forecastFrom", { year: forecastStartYear })}
            </p>
          )}
          <div className="chart-card chart-card-appear" style={{ marginTop: forecastStartYear ? "0.25rem" : "1.5rem" }}>
            <Line
              data={chartData}
              options={chartOptions}
              plugins={[verticalLinePlugin]}
            />
          </div>
        </>
      ) : (
        /* Empty state */
        <div
          className="mt-6 chart-card flex flex-col items-center justify-center gap-3 text-center"
          style={{ minHeight: "18rem" }}
        >
          <div
            style={{
              width: "3rem", height: "3rem",
              borderRadius: "var(--r-lg)",
              background: "var(--accent-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-sm text-muted max-w-xs" style={{ lineHeight: "1.6" }}>
            {t("forecast.emptyState")}
          </p>
        </div>
      )}

      {/* ── Model Comparison ── */}
      {forecast && modelComparison.length > 1 && (
        <div className="mt-4 surface p-4">
          <button
            type="button"
            className="text-xs uppercase tracking-[0.2em] text-faint flex items-center gap-2 w-full text-left"
            onClick={() => setShowModelComparison((v) => !v)}
          >
            {t("forecast.modelComparisonTitle")}
            <span className="ml-auto opacity-60">{showModelComparison ? "▲" : "▼"}</span>
          </button>
          {showModelComparison && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-faint uppercase tracking-wider">
                    <th className="text-left pb-2 pr-4">Model</th>
                    <th className="text-right pb-2 pr-4">{t("forecast.confidenceScore")}</th>
                    <th className="text-right pb-2 pr-4">{t("forecast.rmseLabel")}</th>
                    <th className="text-right pb-2">{t("forecast.maeLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {modelComparison.map((m) => (
                    <tr
                      key={m.model}
                      className={
                        m.selected
                          ? "font-semibold text-amber-700 dark:text-amber-300"
                          : "text-muted"
                      }
                    >
                      <td className="py-1 pr-4 font-mono">
                        {m.model}
                        {m.selected && (
                          <span className="ml-2 text-[10px] uppercase opacity-70">
                            ✓ {t("forecast.selectedModel")}
                          </span>
                        )}
                      </td>
                      <td className="text-right py-1 pr-4">
                        {m.confidence_score != null
                          ? `${(m.confidence_score * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="text-right py-1 pr-4 font-mono">
                        {m.rmse != null ? Number(m.rmse).toFixed(4) : "—"}
                      </td>
                      <td className="text-right py-1 font-mono">
                        {m.mae != null ? Number(m.mae).toFixed(4) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Export ── */}
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
