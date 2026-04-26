/**
 * ChartDisplay — EVision chart renderer
 *
 * Props:
 *   datasets        {Array}   — [{country, data:[{year,value}], ...}] or lorenz shape
 *   chartType       {string}  — 'line' | 'bar' | 'scatter'  (parent-controlled default)
 *   viewMode        {string}  — 'timeSeries' | 'lorenz'
 *   appear          {boolean} — triggers chart-card-appear CSS animation
 *   indicatorLabel  {string}  — used as filename for CSV/PNG exports
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

/* ─────────────────────────────────────────────
   Color palettes — theme-adaptive, accessible.
   Dark: vivid hues on near-black backgrounds.
   Light: deep tones with WCAG-level contrast
   on near-white backgrounds.
   Series 5–6 add dash patterns for color-blind
   safety (distinguishable without hue alone).
───────────────────────────────────────────── */
const PALETTE_DARK = [
  { border: "#38BDF8", bg: "rgba(56,189,248,0.65)",  dash: [],     width: 2.5 },
  { border: "#FB923C", bg: "rgba(251,146,60,0.65)",  dash: [],     width: 2.5 },
  { border: "#4ADE80", bg: "rgba(74,222,128,0.65)",  dash: [],     width: 2.5 },
  { border: "#E879F9", bg: "rgba(232,121,249,0.65)", dash: [],     width: 2.5 },
  { border: "#FBBF24", bg: "rgba(251,191,36,0.65)",  dash: [6, 3], width: 2.5 },
  { border: "#F87171", bg: "rgba(248,113,113,0.65)", dash: [6, 3], width: 2.5 },
];

const PALETTE_LIGHT = [
  { border: "#1D6FD8", bg: "rgba(29,111,216,0.70)",  dash: [],     width: 2.5 },
  { border: "#B45309", bg: "rgba(180,83,9,0.70)",    dash: [],     width: 2.5 },
  { border: "#047857", bg: "rgba(4,120,87,0.70)",    dash: [],     width: 2.5 },
  { border: "#7C3AED", bg: "rgba(124,58,237,0.70)",  dash: [],     width: 2.5 },
  { border: "#B91C1C", bg: "rgba(185,28,28,0.70)",   dash: [6, 3], width: 2.5 },
  { border: "#0E7490", bg: "rgba(14,116,144,0.70)",  dash: [6, 3], width: 2.5 },
];

const TIMEFRAMES = [
  { key: "5Y",  years: 5 },
  { key: "10Y", years: 10 },
  { key: "20Y", years: 20 },
  { key: "All", years: Infinity },
];

/* ─── Inline SVG icons for type switcher ─── */
const ICON_LINE = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <polyline points="1,12 4,7 7,9 10,4 13,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_BAR = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    <rect x="1"   y="8" width="3" height="5" rx="0.5" />
    <rect x="5.5" y="5" width="3" height="8" rx="0.5" />
    <rect x="10"  y="2" width="3" height="11" rx="0.5" />
  </svg>
);
const ICON_SCATTER = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    <circle cx="3"  cy="10" r="1.6" />
    <circle cx="7"  cy="6"  r="1.6" />
    <circle cx="11" cy="3"  r="1.6" />
    <circle cx="5"  cy="11" r="1.2" />
    <circle cx="10" cy="8"  r="1.2" />
  </svg>
);

const TYPE_OPTIONS = [
  { value: "line",    icon: ICON_LINE,    label: "Line" },
  { value: "bar",     icon: ICON_BAR,     label: "Bar" },
  { value: "scatter", icon: ICON_SCATTER, label: "Scatter" },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const getCssVar = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

/* Locale code mapping: app language codes → BCP 47 tags for Intl */
const LOCALE_MAP = { en: "en", ru: "ru", kz: "kk" };

/** Compact number formatter using Intl.NumberFormat for locale-aware output */
const makeFmtCompact = (appLang = "en") => {
  const locale = LOCALE_MAP[appLang] || appLang;
  const fmt = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  return (value) => {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!isFinite(n)) return String(value);
    return fmt.format(n);
  };
};

/* ─────────────────────────────────────────────
   Crosshair plugin — draws a dashed vertical
   line at the hovered x position. Defined once
   outside the component to avoid re-registration
   on every render.
───────────────────────────────────────────── */
const crosshairPlugin = {
  id: "evisionCrosshair",
  afterDraw(chart) {
    const active = chart.tooltip?._active;
    if (!active?.length) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.x) return;
    const xPos = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos, chartArea.top);
    ctx.lineTo(xPos, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = getCssVar("--chart-grid", "rgba(148,163,184,0.4)");
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

/* ─────────────────────────────────────────────
   External HTML tooltip — appended once to the
   chart container, positioned via CSS transform.
   Using HTML instead of Canvas for full styling
   control (rounded corners, shadows, CSS vars).
───────────────────────────────────────────── */
function getOrCreateTooltipEl(container) {
  let el = container.querySelector(".chart-tooltip-ext");
  if (!el) {
    el = document.createElement("div");
    el.className = "chart-tooltip-ext";
    container.appendChild(el);
  }
  return el;
}

function buildExternalTooltip(context) {
  const { chart, tooltip } = context;
  // Append to chart-card container (has position: relative)
  const container = chart.canvas.parentNode;
  const el = getOrCreateTooltipEl(container);

  if (tooltip.opacity === 0) {
    el.style.opacity = "0";
    return;
  }

  if (tooltip.body) {
    const title = tooltip.title?.[0] ?? "";
    const rows = tooltip.body
      .map((b, i) => {
        const color = tooltip.labelColors?.[i]?.borderColor ?? "#94a3b8";
        const line  = b.lines?.[0] ?? "";
        return `<div class="ctt-row"><span class="ctt-dot" style="background:${color}"></span><span>${line}</span></div>`;
      })
      .join("");
    el.innerHTML = `<div class="ctt-title">${title}</div>${rows}`;
  }

  // Position: canvas coords + offset from container (accounts for padding)
  const canvasRect = chart.canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offsetX = canvasRect.left - containerRect.left;
  const offsetY = canvasRect.top  - containerRect.top;
  const caretX  = tooltip.caretX;
  const caretY  = tooltip.caretY;

  // Flip tooltip to left side if near the right edge
  const flipLeft = caretX > chart.canvas.offsetWidth * 0.62;

  el.style.opacity   = "1";
  el.style.left      = `${offsetX + caretX}px`;
  el.style.top       = `${offsetY + caretY}px`;
  el.style.transform = flipLeft ? "translate(calc(-100% - 10px), -45%)" : "translate(10px, -45%)";
}

/* ─────────────────────────────────────────────
   CSV export (uses current filtered datasets)
───────────────────────────────────────────── */
function exportCsv(filteredDatasets, label) {
  if (!filteredDatasets?.length) return;
  const years = new Set();
  filteredDatasets.forEach((d) => d.data?.forEach((p) => years.add(p.year)));
  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const header = ["year", ...filteredDatasets.map((d) => d.country)];
  const rows = sortedYears.map((year) => {
    const vals = filteredDatasets.map((d) => {
      const pt = d.data?.find((p) => p.year === year);
      return pt?.value ?? "";
    });
    return [year, ...vals];
  });
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evision_${label || "data"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   Shared animation config — used in all views
───────────────────────────────────────────── */
const ANIMATION = {
  duration: 340,
  easing: "easeInOutQuart",
};

/* ═══════════════════════════════════════════
   Main component
═══════════════════════════════════════════ */
export default function ChartDisplay({ datasets, chartType, viewMode, appear, indicatorLabel }) {
  const { theme } = useTheme();
  const palette = theme === "dark" ? PALETTE_DARK : PALETTE_LIGHT;
  const { t, language } = useI18n();
  const chartRef = useRef(null);
  const fmtCompact = useMemo(() => makeFmtCompact(language), [language]);

  /* Local chart type — syncs from prop but toolbar can override */
  const [localType, setLocalType] = useState(chartType ?? "line");
  useEffect(() => { setLocalType(chartType ?? "line"); }, [chartType]);

  /* Timeframe filter */
  const [timeframe, setTimeframe] = useState("All");

  /* Axis/grid colors derived directly from theme state — NOT from getCssVar.
     getCssVar reads the DOM at render time, but ThemeContext applies html.dark
     in a useEffect (after render), so getCssVar always reads the previous
     theme's values. Computing from theme state is always synchronous and correct. */
  const axisColor = theme === "dark" ? "rgba(226,232,240,0.7)"  : "rgba(15,23,42,0.66)";
  const gridColor = theme === "dark" ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.12)";

  /* Filtered datasets */
  const filteredDatasets = useMemo(() => {
    if (!datasets?.length) return [];
    const tf = TIMEFRAMES.find((f) => f.key === timeframe);
    if (!tf || tf.years === Infinity) return datasets;
    const maxYear = Math.max(...datasets.flatMap((d) => d.data?.map((p) => p.year) ?? []));
    const cutoff  = maxYear - tf.years;
    return datasets.map((d) => ({ ...d, data: d.data?.filter((p) => p.year > cutoff) ?? [] }));
  }, [datasets, timeframe]);

  /* PNG export */
  const handlePng = useCallback(() => {
    const url = chartRef.current?.toBase64Image?.();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `evision_${indicatorLabel || "chart"}.png`;
    a.click();
  }, [indicatorLabel]);

  /* CSV export */
  const handleCsv = useCallback(() => {
    exportCsv(filteredDatasets, indicatorLabel);
  }, [filteredDatasets, indicatorLabel]);

  /* Reset toolbar state */
  const handleReset = useCallback(() => {
    setTimeframe("All");
    setLocalType(chartType ?? "line");
  }, [chartType]);

  /* ── Toolbar dirty flag ── */
  const isDirty = timeframe !== "All" || localType !== (chartType ?? "line");

  /* ═══════════════════════════════════════════
     Empty state
  ═══════════════════════════════════════════ */
  if (!datasets || datasets.length === 0) {
    return <p className="text-muted text-center mt-4 text-sm">{t("chart.selectFilters")}</p>;
  }

  /* ═══════════════════════════════════════════
     LORENZ VIEW — minimal toolbar (PNG only)
  ═══════════════════════════════════════════ */
  if (viewMode === "lorenz") {
    const equalitySet = {
      label: t("chart.lineOfEquality"),
      data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      borderColor: theme === "dark" ? "rgba(148,163,184,0.55)" : "rgba(71,85,105,0.5)",
      backgroundColor: "transparent",
      borderDash: [6, 4],
      showLine: true,
      pointRadius: 0,
      tension: 0,
      order: 0,
      borderWidth: 1.5,
    };

    const lorenzData = {
      datasets: [
        equalitySet,
        ...datasets.map((dset, i) => {
          const pal = palette[i % palette.length];
          return {
            label: `${dset.country.toUpperCase()} (${dset.year ?? "n/a"})`,
            data: dset.data,
            borderColor: pal.border,
            backgroundColor: pal.bg,
            showLine: true,
            fill: false,
            tension: 0.3,
            borderWidth: pal.width,
            borderDash: pal.dash,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: pal.border,
          };
        }),
      ],
    };

    const lorenzOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIMATION,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: axisColor, usePointStyle: true, pointStyleWidth: 10, padding: 16 },
        },
        tooltip: {
          enabled: false,
          external: buildExternalTooltip,
          mode: "nearest",
          intersect: false,
          callbacks: {
            label: (ctx) => {
              const { x, y } = ctx.parsed;
              return ` ${ctx.dataset.label} — ${(x * 100).toFixed(0)}% pop / ${(y * 100).toFixed(1)}% inc`;
            },
          },
        },
      },
      interaction: { mode: "nearest", axis: "xy", intersect: false },
      scales: {
        x: {
          type: "linear", min: 0, max: 1,
          ticks: { callback: (v) => `${(v * 100).toFixed(0)}%`, color: axisColor, maxTicksLimit: 6 },
          title: { display: true, text: t("chart.populationShare"), color: axisColor, font: { size: 11 } },
          grid: { color: gridColor, borderDash: [4, 4] },
          border: { color: "transparent" },
        },
        y: {
          type: "linear", min: 0, max: 1,
          ticks: { callback: (v) => `${(v * 100).toFixed(0)}%`, color: axisColor, maxTicksLimit: 6 },
          title: { display: true, text: t("chart.incomeShare"), color: axisColor, font: { size: 11 } },
          grid: { color: gridColor, borderDash: [4, 4] },
          border: { color: "transparent" },
        },
      },
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <button className="tab" type="button" onClick={handlePng} aria-label={t("chart.downloadPng")}>
            PNG
          </button>
        </div>
        <div className={appear ? "chart-card chart-card-appear" : "chart-card"} style={{ position: "relative" }}>
          <Chart
            type="scatter"
            ref={chartRef}
            data={lorenzData}
            options={lorenzOptions}
            plugins={[crosshairPlugin]}
          />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     TIME-SERIES VIEW
  ═══════════════════════════════════════════ */
  const isScatter = localType === "scatter";

  /* Build year labels from filtered data */
  const yearSet = new Set();
  filteredDatasets.forEach((d) => d.data?.forEach((p) => yearSet.add(p.year)));
  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);

  /* Chart.js datasets */
  const chartData = {
    ...(isScatter ? {} : { labels: sortedYears }),
    datasets: filteredDatasets.map((dset, i) => {
      const pal = palette[i % palette.length];

      if (isScatter) {
        const pts = [...(dset.data ?? [])].sort((a, b) => a.year - b.year);
        return {
          label: dset.country.toUpperCase(),
          data: pts.map(({ year, value }) => ({ x: year, y: value })),
          borderColor: pal.border,
          backgroundColor: pal.border,
          pointRadius: 4,
          pointHoverRadius: 6,
          showLine: false,
        };
      }

      const valueMap = Object.fromEntries((dset.data ?? []).map((p) => [p.year, p.value]));
      return {
        label: dset.country.toUpperCase(),
        data: sortedYears.map((year) => valueMap[year] ?? null),
        borderColor: pal.border,
        backgroundColor: pal.bg,
        fill: false,
        tension: 0.28,
        borderWidth: pal.width,
        borderDash: pal.dash,
        // Hide individual points on dense data (>40 points), show on hover
        pointRadius: sortedYears.length > 40 ? 0 : 2.5,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: pal.border,
        pointBorderColor: "transparent",
        spanGaps: false,
      };
    }),
  };

  /* Chart.js options */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: ANIMATION,
    transitions: {
      // Animate data updates (timeframe filter)
      active: { animation: { duration: 180 } },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: axisColor,
          usePointStyle: true,
          pointStyleWidth: 10,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        enabled: false,
        external: buildExternalTooltip,
        mode: isScatter ? "nearest" : "index",
        intersect: false,
        callbacks: {
          label: (ctx) => {
            const v = isScatter ? ctx.parsed.y : ctx.parsed.y;
            return ` ${ctx.dataset.label}: ${fmtCompact(v)}`;
          },
        },
      },
    },
    interaction: { mode: isScatter ? "nearest" : "index", axis: "x", intersect: false },
    scales: {
      x: isScatter
        ? {
            type: "linear",
            title: { display: true, text: t("chart.year"), color: axisColor, font: { size: 11 } },
            ticks: { precision: 0, color: axisColor, maxTicksLimit: 8 },
            grid: { color: gridColor, borderDash: [4, 4] },
            border: { color: "transparent" },
          }
        : {
            ticks: { color: axisColor, maxTicksLimit: 10, font: { size: 11 } },
            grid: { display: false },
            border: { color: "transparent" },
          },
      y: {
        ticks: {
          color: axisColor,
          maxTicksLimit: 6,
          font: { size: 11 },
          callback: fmtCompact,
        },
        grid: { color: gridColor, borderDash: [4, 4] },
        border: { color: "transparent" },
      },
    },
  };

  /* ─── Render ─── */
  return (
    <div className="space-y-3">
      {/* ════ Toolbar ════ */}
      <div className="flex flex-wrap items-center justify-between gap-2">

        {/* Left — timeframe chips */}
        <div className="flex gap-1" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              type="button"
              className={timeframe === tf.key ? "tab-active" : "tab"}
              onClick={() => setTimeframe(tf.key)}
              aria-pressed={timeframe === tf.key}
            >
              {tf.key}
            </button>
          ))}
        </div>

        {/* Right — type switcher + exports + reset */}
        <div className="flex items-center gap-1.5">

          {/* Chart type icon group */}
          <div
            className="flex gap-px p-0.5 rounded-full"
            style={{ background: "var(--panel-soft)", border: "1px solid var(--panel-border)" }}
            role="group"
            aria-label="Chart type"
          >
            {TYPE_OPTIONS.map((opt) => {
              const active = localType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  aria-label={opt.label}
                  aria-pressed={active}
                  className="flex items-center justify-center w-7 h-7 rounded-full"
                  style={{
                    transition: "background-color var(--dur-fast) var(--ease-ui), color var(--dur-fast) var(--ease-ui), border-color var(--dur-fast) var(--ease-ui)",
                    background:   active ? "var(--tab-active-bg)"     : "transparent",
                    color:        active ? "var(--tab-active-text)"   : "var(--text-faint)",
                    border:       active ? "1px solid var(--tab-active-border)" : "1px solid transparent",
                  }}
                  onClick={() => setLocalType(opt.value)}
                >
                  {opt.icon}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-4" style={{ background: "var(--panel-border)" }} aria-hidden="true" />

          {/* CSV */}
          <button
            type="button"
            className="tab"
            title={t("chart.downloadCsv")}
            aria-label={t("chart.downloadCsv")}
            onClick={handleCsv}
          >
            CSV
          </button>

          {/* PNG */}
          <button
            type="button"
            className="tab"
            title={t("chart.downloadPng")}
            aria-label={t("chart.downloadPng")}
            onClick={handlePng}
          >
            PNG
          </button>

          {/* Reset — only when toolbar state differs from defaults */}
          {isDirty && (
            <button
              type="button"
              className="tab"
              title={t("chart.reset")}
              aria-label={t("chart.reset")}
              onClick={handleReset}
              style={{ color: "var(--accent)" }}
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* ════ Chart canvas ════
          key={localType} forces a clean remount (with entrance animation)
          when switching chart types. Timeframe changes happen in-place
          with data animations (no remount).
      ════════════════════════ */}
      <div
        key={localType}
        className={appear ? "chart-card chart-card-appear" : "chart-card"}
        style={{ position: "relative" }}
      >
        <Chart
          type={localType}
          ref={chartRef}
          data={chartData}
          options={options}
          plugins={[crosshairPlugin]}
        />
      </div>
    </div>
  );
}
