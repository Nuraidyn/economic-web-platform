/**
 * IncomeComparisonSection — benchmark salary against country averages
 * with optional inflation adjustment and chart visualization.
 *
 * Props:
 *   userSalary  {number}  monthly income from the form (USD assumed)
 *   userCountry {string}  country name selected in the form
 */
import React, { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { useI18n } from "../../context/I18nContext";
import { useTheme } from "../../context/ThemeContext";
import {
  COUNTRY_INCOME_DATA,
  COMPARISON_COUNTRIES,
  PERIOD_YEARS,
} from "../../data/countryIncomeData";
import {
  calcSalaryGap,
  calcSalaryGapPercent,
  calcCumulativeInflation,
  calcRealIncome,
  calcPPPSalary,
  estimatePercentile,
  rankCountriesByRealEarnings,
} from "../../utils/incomeAnalysis";

/* suppress unused import warning — ChartJS must be imported for side-effects */
ChartJS;

/* ── helpers ────────────────────────────────────────────────────────────── */

/** Map form country name → COUNTRY_INCOME_DATA key */
function matchCountryCode(countryName) {
  if (!countryName) return null;
  const lower = countryName.toLowerCase();
  for (const [code, d] of Object.entries(COUNTRY_INCOME_DATA)) {
    if (d.name.toLowerCase() === lower) return code;
  }
  // Partial match fallback
  for (const [code, d] of Object.entries(COUNTRY_INCOME_DATA)) {
    if (lower.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(lower)) return code;
  }
  return null;
}

const fmt = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/* ── colour palette matching ChartDisplay ── */
const PALETTE_COLORS = [
  { border: "#38BDF8", bg: "rgba(56,189,248,0.55)" },
  { border: "#F59E0B", bg: "rgba(245,158,11,0.55)" },
  { border: "#34D399", bg: "rgba(52,211,153,0.55)" },
  { border: "#A78BFA", bg: "rgba(167,139,250,0.55)" },
  { border: "#FB7185", bg: "rgba(251,113,133,0.50)" },
  { border: "#22D3EE", bg: "rgba(34,211,238,0.50)" },
];
const MY_SALARY_COLOR = { border: "#FBBF24", bg: "rgba(251,191,36,0.70)" };

const DEFAULT_COMPARISON = ["US", "DE", "GB"];

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, highlight }) {
  return (
    <div className="panel space-y-2">
      <p className="label">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${highlight || ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function IncomeComparisonSection({ userSalary, userCountry, userCurrency, originalSalary }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── initial country code from form ── */
  const initialCode = useMemo(() => matchCountryCode(userCountry), [userCountry]);

  const [selectedCountry, setSelectedCountry] = useState(initialCode || "US");
  const [comparisonCountries, setComparisonCountries] = useState(DEFAULT_COMPARISON);
  const [period, setPeriod] = useState("3Y");
  const [adjustInflation, setAdjustInflation] = useState(true);
  const [adjustPPP, setAdjustPPP] = useState(false);
  const [showMyLine, setShowMyLine] = useState(true);

  const years = PERIOD_YEARS[period];
  const salary = userSalary > 0 ? userSalary : 0;

  /* ── selected-country data ── */
  const selectedData = COUNTRY_INCOME_DATA[selectedCountry];

  /* ── effective salary & avg after PPP ── */
  const effectiveSalary = adjustPPP && selectedData?.pppIndex
    ? calcPPPSalary(salary, selectedData.pppIndex)
    : salary;

  const effectiveAvg = (code) => {
    const d = COUNTRY_INCOME_DATA[code];
    if (!d) return 0;
    return adjustPPP && d.pppIndex ? calcPPPSalary(d.avgMonthlyIncome, d.pppIndex) : d.avgMonthlyIncome;
  };

  /* ── KPI calculations ── */
  const kpiData = useMemo(() => {
    if (!selectedData) return null;
    const cumInfl = calcCumulativeInflation(selectedData.yearlyInflation, years);
    const countryAvg = adjustPPP && selectedData.pppIndex
      ? calcPPPSalary(selectedData.avgMonthlyIncome, selectedData.pppIndex)
      : selectedData.avgMonthlyIncome;
    const gap = calcSalaryGap(effectiveSalary, countryAvg);
    const gapPct = calcSalaryGapPercent(effectiveSalary, countryAvg);
    const realIncome = calcRealIncome(effectiveSalary > 0 ? effectiveSalary : countryAvg, cumInfl);
    const percentile = salary > 0 ? estimatePercentile(salary, selectedData.avgMonthlyIncome) : null;
    const ranking = rankCountriesByRealEarnings(COUNTRY_INCOME_DATA, years);
    const bestCountry = ranking[0];
    return { cumInfl, gap, gapPct, realIncome, bestCountry, percentile };
  }, [selectedData, salary, effectiveSalary, years, adjustPPP]);

  /* ── chart dataset ── */
  const chartData = useMemo(() => {
    if (comparisonCountries.length === 0) return null;

    const labels = comparisonCountries
      .map((code) => COUNTRY_INCOME_DATA[code]?.name || code)
      .concat(showMyLine ? [t("comparison.yourSalary")] : []);

    const nominalValues = comparisonCountries.map((code) => effectiveAvg(code));

    const datasets = [];

    if (adjustInflation) {
      const realValues = comparisonCountries.map((code) => {
        const d = COUNTRY_INCOME_DATA[code];
        if (!d) return 0;
        const base = effectiveAvg(code);
        const cumInfl = calcCumulativeInflation(d.yearlyInflation, years);
        return Math.round(calcRealIncome(base, cumInfl));
      });

      datasets.push({
        label: t("comparison.nominal"),
        data: nominalValues.concat(showMyLine ? [effectiveSalary] : []),
        backgroundColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].bg)
          .concat(showMyLine ? [MY_SALARY_COLOR.bg] : []),
        borderColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].border)
          .concat(showMyLine ? [MY_SALARY_COLOR.border] : []),
        borderWidth: 1.5,
        borderRadius: 6,
      });

      datasets.push({
        label: t("comparison.real"),
        data: realValues.concat(showMyLine ? [
          Math.round(calcRealIncome(effectiveSalary, calcCumulativeInflation(
            selectedData?.yearlyInflation || {}, years
          )))
        ] : []),
        backgroundColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].bg.replace("0.55", "0.25").replace("0.50", "0.22"))
          .concat(showMyLine ? ["rgba(251,191,36,0.32)"] : []),
        borderColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].border)
          .concat(showMyLine ? [MY_SALARY_COLOR.border] : []),
        borderWidth: 1.5,
        borderRadius: 6,
        borderDash: [4, 3],
      });
    } else {
      datasets.push({
        label: t("comparison.nominal"),
        data: nominalValues.concat(showMyLine ? [effectiveSalary] : []),
        backgroundColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].bg)
          .concat(showMyLine ? [MY_SALARY_COLOR.bg] : []),
        borderColor: comparisonCountries
          .map((_, i) => PALETTE_COLORS[i % PALETTE_COLORS.length].border)
          .concat(showMyLine ? [MY_SALARY_COLOR.border] : []),
        borderWidth: 1.5,
        borderRadius: 6,
      });
    }

    return { labels, datasets };
  }, [comparisonCountries, showMyLine, adjustInflation, adjustPPP, years, salary, effectiveSalary, selectedData, t]);

  /* ── chart options ── */
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: isDark ? "rgba(226,232,240,0.8)" : "rgba(15,23,42,0.7)",
          font: { size: 11 },
          boxWidth: 12,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            return ` ${ctx.dataset.label}: ${fmt(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? "rgba(226,232,240,0.7)" : "rgba(15,23,42,0.66)",
          font: { size: 11 },
        },
        grid: { color: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.08)" },
      },
      y: {
        ticks: {
          color: isDark ? "rgba(226,232,240,0.7)" : "rgba(15,23,42,0.66)",
          font: { size: 11 },
          callback: (v) => `$${(v / 1000).toFixed(0)}k`,
        },
        grid: { color: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.08)" },
      },
    },
  }), [isDark]);

  /* ── toggle comparison country ── */
  function toggleComparisonCountry(code) {
    setComparisonCountries((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 6) return prev; // max 6
      return [...prev, code];
    });
  }

  /* ── render ── */
  return (
    <div className="panel-wide space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="page-section-kicker">{t("comparison.title")}</span>
          <p className="text-xs text-muted mt-1">{t("comparison.subtitle")}</p>
        </div>
        {userCurrency && userCurrency !== "USD" && originalSalary > 0 && (
          <span className="text-xs text-faint italic self-end">
            {t("comparison.currencyConverted", {
              amount: new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(originalSalary),
              currency: userCurrency,
              usd: new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(userSalary),
            })}
          </span>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {kpiData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <KpiCard
            label={t("comparison.yourSalaryVsAvg")}
            value={fmt(Math.abs(kpiData.gap))}
            sub={
              salary > 0
                ? `${fmtPct(kpiData.gapPct)} ${kpiData.gap >= 0 ? t("comparison.above") : t("comparison.below")}`
                : "—"
            }
            highlight={
              salary <= 0 ? "" : kpiData.gap >= 0 ? "text-emerald-400" : "text-rose-400"
            }
          />
          <KpiCard
            label={t("comparison.inflation")}
            value={`${(kpiData.cumInfl * 100).toFixed(1)}%`}
            sub={`${years}Y ${t("comparison.period").toLowerCase()}`}
          />
          <KpiCard
            label={t("comparison.realIncomeChange")}
            value={salary > 0 ? fmt(Math.round(kpiData.realIncome)) : "—"}
            sub={salary > 0 ? `${t("comparison.nominal")}: ${fmt(salary)}` : ""}
            highlight={
              salary > 0
                ? kpiData.realIncome >= salary ? "text-emerald-400" : "text-amber-400"
                : ""
            }
          />
          <KpiCard
            label={t("comparison.bestBenchmark")}
            value={kpiData.bestCountry.name}
            sub={`${fmt(Math.round(kpiData.bestCountry.realIncome))} ${t("comparison.real").toLowerCase()}`}
            highlight="text-[var(--accent)]"
          />
          {kpiData.percentile != null && (
            <KpiCard
              label={t("comparison.percentile")}
              value={`${t("comparison.percentileTop")} ${100 - kpiData.percentile}%`}
              sub={t("comparison.percentileOf", { country: selectedData?.name || "" })}
              highlight={kpiData.percentile >= 70 ? "text-emerald-400" : kpiData.percentile >= 40 ? "text-amber-400" : "text-rose-400"}
            />
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="space-y-4">
        {/* Row 1: Your country + period */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="label whitespace-nowrap" htmlFor="ics-country">
              {t("incomeAnalysis.country")}
            </label>
            <select
              id="ics-country"
              className="input"
              style={{ width: "auto", minWidth: "9rem" }}
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {COMPARISON_COUNTRIES.map(({ code, name }) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="label">{t("comparison.period")}</span>
            <div className="flex gap-1">
              {Object.keys(PERIOD_YEARS).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={period === p ? "tab-active" : "tab"}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={adjustInflation}
              onChange={(e) => setAdjustInflation(e.target.checked)}
            />
            <span
              className={`w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                adjustInflation
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--panel-border)]"
              }`}
              style={{ padding: "2px" }}
            >
              <span
                className="w-4 h-4 rounded-full bg-white block transition-transform duration-200"
                style={{ transform: adjustInflation ? "translateX(16px)" : "translateX(0)" }}
              />
            </span>
            <span className="text-xs text-muted">{t("comparison.adjustInflation")}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={adjustPPP}
              onChange={(e) => setAdjustPPP(e.target.checked)}
            />
            <span
              className={`w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                adjustPPP
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--panel-border)]"
              }`}
              style={{ padding: "2px" }}
            >
              <span
                className="w-4 h-4 rounded-full bg-white block transition-transform duration-200"
                style={{ transform: adjustPPP ? "translateX(16px)" : "translateX(0)" }}
              />
            </span>
            <span className="text-xs text-muted">{t("comparison.pppAdjusted")}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={showMyLine}
              onChange={(e) => setShowMyLine(e.target.checked)}
            />
            <span
              className={`w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                showMyLine
                  ? "bg-[color-mix(in_srgb,var(--accent-strong)_80%,transparent)]"
                  : "bg-[var(--panel-border)]"
              }`}
              style={{ padding: "2px" }}
            >
              <span
                className="w-4 h-4 rounded-full bg-white block transition-transform duration-200"
                style={{ transform: showMyLine ? "translateX(16px)" : "translateX(0)" }}
              />
            </span>
            <span className="text-xs text-muted">{t("comparison.showMyLine")}</span>
          </label>
        </div>

        {/* Row 2: Compare with checkboxes */}
        <div>
          <p className="label mb-2">{t("comparison.comparisonCountries")} ({comparisonCountries.length}/6)</p>
          <div className="flex flex-wrap gap-2">
            {COMPARISON_COUNTRIES.map(({ code, name }) => {
              const checked = comparisonCountries.includes(code);
              const disabled = !checked && comparisonCountries.length >= 6;
              return (
                <button
                  key={code}
                  type="button"
                  disabled={disabled}
                  className={checked ? "tab-active" : "tab"}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                  onClick={() => toggleComparisonCountry(code)}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      {comparisonCountries.length === 0 ? (
        <div className="chart-card flex items-center justify-center">
          <p className="text-sm text-muted text-center px-4">
            {t("comparison.noCountries")}
          </p>
        </div>
      ) : (
        <div className="chart-card chart-card-appear">
          {chartData && (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      )}
    </div>
  );
}
