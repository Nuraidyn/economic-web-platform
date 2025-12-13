import React from "react";

export default function FilterPanel({
  chartType,
  setChartType,
  startYear,
  endYear,
  setStartYear,
  setEndYear,
  viewMode,
  setViewMode,
  lorenzYear,
  setLorenzYear,
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-wrap gap-4 items-start justify-between border p-4 rounded-md bg-white shadow-sm">
      <div>
        <label className="block text-sm font-semibold">Analysis Mode</label>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="timeSeries">Time Series</option>
          <option value="lorenz">Lorenz Curve</option>
        </select>
      </div>

      {viewMode === "timeSeries" && (
        <>
          <div>
            <label className="block text-sm font-semibold">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="scatter">Scatter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold">Start Year</label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="border p-2 rounded w-24"
              min="1960"
              max={currentYear}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold">End Year</label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="border p-2 rounded w-24"
              min="1960"
              max={currentYear}
            />
          </div>
        </>
      )}

      {viewMode === "lorenz" && (
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold">Lorenz Curve Year</label>
          <input
            type="number"
            value={lorenzYear}
            onChange={(e) => setLorenzYear(Number(e.target.value))}
            className="border p-2 rounded w-32"
            min="1960"
            max={currentYear}
          />
          <p className="text-xs text-slate-500 mt-1">
            Uses quintile income shares for the selected year (falls back to closest available).
          </p>
        </div>
      )}
    </div>
  );
}
