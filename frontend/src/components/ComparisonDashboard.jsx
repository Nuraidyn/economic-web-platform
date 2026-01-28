import React, { useMemo } from "react";

import ChartDisplay from "./ChartDisplay";

const computeCorrelation = (seriesA, seriesB) => {
  const mapA = new Map(seriesA.map((row) => [row.year, row.value]));
  const paired = seriesB
    .filter((row) => mapA.has(row.year))
    .map((row) => [mapA.get(row.year), row.value])
    .filter(([a, b]) => typeof a === "number" && typeof b === "number");

  if (paired.length < 3) {
    return null;
  }
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
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
};

export default function ComparisonDashboard({ datasets, chartType, correlationPair, indicators }) {
  const indicatorLabel = (code) =>
    indicators.find((item) => item.code === code)?.label || code;

  const correlationTable = useMemo(() => {
    if (!correlationPair?.length || correlationPair.length < 2) {
      return [];
    }
    const [primary, secondary] = correlationPair;
    const primaryData = datasets.find((entry) => entry.indicator === primary);
    const secondaryData = datasets.find((entry) => entry.indicator === secondary);
    if (!primaryData || !secondaryData) {
      return [];
    }
    return primaryData.series.map((series) => {
      const secondarySeries = secondaryData.series.find(
        (candidate) => candidate.country === series.country
      );
      const correlation = secondarySeries
        ? computeCorrelation(series.data, secondarySeries.data)
        : null;
      return {
        country: series.country,
        correlation,
      };
    });
  }, [datasets, correlationPair]);

  if (!datasets.length) {
    return (
      <section className="panel-wide">
        <p className="text-sm text-slate-200/70">
          Select countries and indicators, then run the comparison to populate charts.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {datasets.map((entry) => (
        <div className="panel-wide" key={entry.indicator}>
          <h3 className="panel-title">{indicatorLabel(entry.indicator)}</h3>
          <p className="text-xs text-slate-200/70 mb-4">
            Historical series by country. Missing values are left blank to preserve data integrity.
          </p>
          <ChartDisplay datasets={entry.series} chartType={chartType} viewMode="timeSeries" />
        </div>
      ))}

      {correlationTable.length > 0 && (
        <div className="panel-wide">
          <h3 className="panel-title">Correlation Snapshot</h3>
          <p className="text-xs text-slate-200/70 mb-4">
            Pearson correlation between {indicatorLabel(correlationPair[0])} and
            {" "}
            {indicatorLabel(correlationPair[1])} on overlapping years.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {correlationTable.map((row) => (
              <div
                key={row.country}
                className="rounded-2xl border border-slate-100/20 bg-slate-900/50 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                  {row.country}
                </p>
                <p className="text-2xl font-semibold text-white mt-2">
                  {row.correlation == null ? "n/a" : row.correlation.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
