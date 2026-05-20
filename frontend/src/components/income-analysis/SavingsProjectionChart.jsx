import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { useI18n } from "../../context/I18nContext";
import { useTheme } from "../../context/ThemeContext";

ChartJS;

const YEARS = 10;

function buildProjection(monthlyIncome, monthlyExpenses, growthPct, targetRate) {
  const points = [0];
  let acc = 0;
  for (let t = 1; t <= YEARS; t++) {
    const incomeThisYear = monthlyIncome * Math.pow(1 + growthPct / 100, t - 1);
    const savings = targetRate !== null
      ? incomeThisYear * (targetRate / 100) * 12
      : (incomeThisYear - monthlyExpenses) * 12;
    acc += savings;
    points.push(Math.round(acc));
  }
  return points;
}

export default function SavingsProjectionChart({ formData }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { monthlyIncome, monthlyExpenses, growthPct, currency } = formData;

  const labels = useMemo(() => Array.from({ length: YEARS + 1 }, (_, i) => i === 0 ? t("incomeAnalysis.projectionNow") : `${t("incomeAnalysis.projectionYear")} ${i}`), [t]);

  const currentPace  = useMemo(() => buildProjection(monthlyIncome, monthlyExpenses, 0,        null), [monthlyIncome, monthlyExpenses]);
  const withGrowth   = useMemo(() => buildProjection(monthlyIncome, monthlyExpenses, growthPct, null), [monthlyIncome, monthlyExpenses, growthPct]);
  const targetTwenty = useMemo(() => buildProjection(monthlyIncome, monthlyExpenses, growthPct, 20),  [monthlyIncome, monthlyExpenses, growthPct]);

  const textColor   = isDark ? "rgba(226,232,240,0.75)" : "rgba(15,23,42,0.65)";
  const gridColor   = isDark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.07)";

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      notation: Math.abs(n) >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: 0,
    }).format(n);

  const chartData = {
    labels,
    datasets: [
      {
        label: t("incomeAnalysis.projectionCurrent"),
        data: currentPace,
        borderColor: "#94A3B8",
        backgroundColor: "rgba(148,163,184,0.08)",
        borderWidth: 1.8,
        borderDash: [5, 4],
        pointRadius: 2,
        tension: 0.35,
        fill: false,
      },
      ...(growthPct > 0 ? [{
        label: t("incomeAnalysis.projectionWithGrowth", { pct: growthPct }),
        data: withGrowth,
        borderColor: "#38BDF8",
        backgroundColor: "rgba(56,189,248,0.08)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.35,
        fill: false,
      }] : []),
      {
        label: t("incomeAnalysis.projectionTarget"),
        data: targetTwenty,
        borderColor: "#34D399",
        backgroundColor: "rgba(52,211,153,0.10)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: textColor,
          font: { size: 11 },
          boxWidth: 14,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: {
          color: textColor,
          font: { size: 11 },
          callback: (v) => fmt(v),
        },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <div className="panel-wide space-y-4">
      <div>
        <span className="page-section-kicker">{t("incomeAnalysis.projectionTitle")}</span>
        <p className="text-xs text-muted mt-1">{t("incomeAnalysis.projectionSubtitle")}</p>
      </div>

      {/* Legend explanation */}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span><span className="inline-block w-6 border-t border-dashed border-[#94A3B8] align-middle mr-1.5" />{t("incomeAnalysis.projectionCurrentDesc")}</span>
        {growthPct > 0 && <span><span className="inline-block w-6 border-t-2 border-[#38BDF8] align-middle mr-1.5" />{t("incomeAnalysis.projectionGrowthDesc", { pct: growthPct })}</span>}
        <span><span className="inline-block w-6 border-t-2 border-[#34D399] align-middle mr-1.5" />{t("incomeAnalysis.projectionTargetDesc")}</span>
      </div>

      <div className="chart-card chart-card-appear" style={{ height: "260px" }}>
        <Line data={chartData} options={options} />
      </div>

      <p className="text-xs text-faint italic">{t("incomeAnalysis.projectionNote", { currency: currency || "USD" })}</p>
    </div>
  );
}
