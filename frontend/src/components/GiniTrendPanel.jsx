import React, { useMemo, useState } from "react";

import { fetchGiniTrend } from "../api/analyticsApi";
import ChartDisplay from "./ChartDisplay";

const lastNonNull = (points) => {
  const filtered = (points || []).filter((item) => typeof item.value === "number");
  return filtered.length ? filtered[filtered.length - 1] : null;
};

export default function GiniTrendPanel({ canAccess, countries, startYear, endYear, chartType }) {
  const [datasets, setDatasets] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const canRun = canAccess && (countries?.length || 0) > 0;

  const loadTrends = async () => {
    if (!canRun) {
      setStatus({
        loading: false,
        error: canAccess ? "Select at least one country to load Gini trends." : "Accept the agreement to unlock inequality analytics.",
      });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const results = await Promise.all(
        countries.map(async (country) => {
          const payload = await fetchGiniTrend({ country, start_year: startYear, end_year: endYear });
          const points = (payload.points || []).map((row) => ({ year: row.year, value: row.value }));
          return { country, data: points, meta: payload.meta };
        })
      );
      setDatasets(results);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      setStatus({ loading: false, error: "Failed to load Gini trend analytics. Ensure FastAPI is running and agreement is accepted." });
    }
  };

  const summaryRows = useMemo(() => {
    return datasets.map((dataset) => {
      const latest = lastNonNull(dataset.data);
      return {
        country: dataset.country,
        latestYear: latest?.year ?? null,
        latestValue: latest?.value ?? null,
        source: dataset.meta?.source ?? "unknown",
      };
    });
  }, [datasets]);

  return (
    <section className="panel-wide">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="panel-title">Inequality trend (Gini)</h3>
          <p className="text-xs text-slate-200/70 mt-2">
            Trend line based on World Bank Gini indicator ({`SI.POV.GINI`}). Use it for cross-country trend context and YoY shifts.
          </p>
        </div>
        <button className="btn-secondary" type="button" onClick={loadTrends} disabled={status.loading}>
          {status.loading ? "Loading..." : "Load Gini trends"}
        </button>
      </div>

      {status.error && <p className="text-xs text-rose-200/90 mt-3">{status.error}</p>}

      {datasets.length > 0 && (
        <div className="mt-6 space-y-6">
          <ChartDisplay datasets={datasets} chartType={chartType || "line"} viewMode="timeSeries" />

          <div className="grid md:grid-cols-3 gap-4">
            {summaryRows.map((row) => (
              <div
                key={row.country}
                className="rounded-2xl border border-slate-100/15 bg-slate-900/50 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">{row.country}</p>
                <p className="text-2xl font-semibold text-white mt-2">
                  {row.latestValue == null ? "n/a" : row.latestValue.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-300/70">
                  {row.latestYear ? `Last year: ${row.latestYear}` : "No data"} · Source {row.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

