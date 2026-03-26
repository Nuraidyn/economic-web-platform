import React, { useMemo } from "react";

import ChartDisplay from "./ChartDisplay";
import { useI18n } from "../context/I18nContext";

const exportIndicatorCsv = (entry) => {
  const years = new Set();
  entry.series.forEach((series) => series.data.forEach((row) => years.add(row.year)));
  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const countries = entry.series.map((row) => row.country);
  const rows = [["year", ...countries]];

  sortedYears.forEach((year) => {
    const values = entry.series.map((series) => {
      const found = series.data.find((row) => row.year === year);
      return found?.value ?? "";
    });
    rows.push([year, ...values]);
  });

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `comparison_${entry.indicator}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const computeCorrelation = (seriesA, seriesB) => {
  const mapA = new Map(seriesA.map((row) => [row.year, row.value]));
  const paired = seriesB
    .filter((row) => mapA.has(row.year))
    .map((row) => [mapA.get(row.year), row.value])
    .filter(([a, b]) => typeof a === "number" && typeof b === "number");

  if (paired.length < 3) return null;

  const meanA = paired.reduce((sum, [a]) => sum + a, 0) / paired.length;
  const meanB = paired.reduce((sum, [, b]) => sum + b, 0) / paired.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  paired.forEach(([a, b]) => {
    const diffA = a - meanA;
    const diffB = b - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  });
  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return null;
  return numerator / denominator;
};

/* ── Skeleton placeholder shown while data is loading ── */
function SkeletonDashboard() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading charts">
      {[0, 1].map((i) => (
        <div className="panel-wide space-y-4" key={i}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="skeleton skeleton-title w-48" />
              <div className="skeleton skeleton-text w-64 opacity-70" />
            </div>
            <div className="skeleton skeleton-text w-24 h-8 rounded-full opacity-60" />
          </div>
          {/* Chart area */}
          <div className="skeleton skeleton-block w-full" style={{ height: "clamp(22rem, 46vh, 38rem)" }} />
        </div>
      ))}
    </section>
  );
}

export default function ComparisonDashboard({ datasets, chartType, correlationPair, indicators, isLoading }) {
  const { t } = useI18n();
  const indicatorLabel = (code) =>
    indicators.find((item) => item.code === code)?.label || code;

  const correlationTable = useMemo(() => {
    if (!correlationPair?.length || correlationPair.length < 2) return [];
    const [primary, secondary] = correlationPair;
    const primaryData = datasets.find((entry) => entry.indicator === primary);
    const secondaryData = datasets.find((entry) => entry.indicator === secondary);
    if (!primaryData || !secondaryData) return [];
    return primaryData.series.map((series) => {
      const secondarySeries = secondaryData.series.find(
        (candidate) => candidate.country === series.country
      );
      const correlation = secondarySeries
        ? computeCorrelation(series.data, secondarySeries.data)
        : null;
      return { country: series.country, correlation };
    });
  }, [datasets, correlationPair]);

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (!datasets.length) {
    return (
      <section className="panel-wide">
        <p className="text-sm text-muted">{t("comparison.empty")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {datasets.map((entry) => (
        <div className="panel-wide" key={entry.indicator}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="panel-title">{indicatorLabel(entry.indicator)}</h3>
              <p className="text-xs text-muted mb-4">{t("comparison.historicalByCountry")}</p>
            </div>
            <button
              className="btn-secondary shrink-0"
              type="button"
              onClick={() => exportIndicatorCsv(entry)}
            >
              {t("comparison.exportCsv")}
            </button>
          </div>
          <ChartDisplay
            datasets={entry.series}
            chartType={chartType}
            viewMode="timeSeries"
            appear
            indicatorLabel={indicatorLabel(entry.indicator)}
          />
        </div>
      ))}

      {correlationTable.length > 0 && (
        <div className="panel-wide">
          <h3 className="panel-title">{t("comparison.correlationSnapshot")}</h3>
          <p className="text-xs text-muted mb-4">
            {t("comparison.correlationSubtitle", {
              indicatorA: indicatorLabel(correlationPair[0]),
              indicatorB: indicatorLabel(correlationPair[1]),
            })}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {correlationTable.map((row) => (
              <div key={row.country} className="surface p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-faint">{row.country}</p>
                <p className="text-2xl font-semibold mt-2">
                  {row.correlation == null ? t("common.na") : row.correlation.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
