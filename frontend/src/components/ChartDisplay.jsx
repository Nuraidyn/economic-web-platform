import React, { useMemo, useRef } from "react";
import { Line, Bar, Scatter } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { useTheme } from "../context/ThemeContext";

const palette = [
  { border: "#2563eb", bg: "rgba(37,99,235,0.3)" },
  { border: "#dc2626", bg: "rgba(220,38,38,0.3)" },
  { border: "#16a34a", bg: "rgba(22,163,74,0.3)" },
  { border: "#9333ea", bg: "rgba(147,51,234,0.3)" },
  { border: "#eab308", bg: "rgba(234,179,8,0.3)" },
];

const getCssVar = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export default function ChartDisplay({ datasets, chartType, viewMode }) {
  const { theme } = useTheme();
  const chartRef = useRef(null);
  const axisColor = useMemo(() => getCssVar("--chart-axis", "rgba(226, 232, 240, 0.7)"), [theme]);
  const gridColor = useMemo(() => getCssVar("--chart-grid", "rgba(148, 163, 184, 0.2)"), [theme]);

  const downloadName = useMemo(() => {
    if (!datasets?.length) return "chart";
    const suffix = viewMode === "lorenz" ? "lorenz" : "series";
    const countries = datasets.map((item) => item.country).filter(Boolean).slice(0, 3).join("-");
    return `${suffix}_${countries || "data"}`;
  }, [datasets, viewMode]);

  const handleDownload = () => {
    const chart = chartRef.current;
    const url = chart?.toBase64Image?.();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${downloadName}.png`;
    link.click();
  };

  if (!datasets || datasets.length === 0) {
    return <p className="text-muted text-center mt-4">Select filters and fetch data.</p>;
  }

  if (viewMode === "lorenz") {
    const equalityDataset = {
      label: "Line of equality",
      data: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      borderColor: "#94a3b8",
      backgroundColor: "transparent",
      borderDash: [6, 6],
      showLine: true,
      pointRadius: 0,
      tension: 0,
      order: 0,
    };

    const lorenzData = {
      datasets: [
        equalityDataset,
        ...datasets.map((dset, index) => {
          const colors = palette[index % palette.length];
          return {
            label: `${dset.country.toUpperCase()} (${dset.year ?? "n/a"})`,
            data: dset.data,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            showLine: true,
            fill: false,
            tension: 0.2,
          };
        }),
      ],
    };

    const lorenzOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: axisColor } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const { x, y } = context.parsed;
              return `${context.dataset.label}: ${(x * 100).toFixed(0)}% population, ${(y * 100).toFixed(1)}% income`;
            },
          },
        },
      },
      interaction: { mode: "nearest", axis: "xy", intersect: false },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 1,
          ticks: {
            callback: (value) => `${value * 100}%`,
            color: axisColor,
          },
          title: { display: true, text: "Cumulative population share", color: axisColor },
          grid: { color: gridColor },
        },
        y: {
          type: "linear",
          min: 0,
          max: 1,
          ticks: {
            callback: (value) => `${value * 100}%`,
            color: axisColor,
          },
          title: { display: true, text: "Cumulative income share", color: axisColor },
          grid: { color: gridColor },
        },
      },
    };

    return (
      <div className="chart-card">
        <div className="flex items-center justify-end mb-2">
          <button className="btn-secondary" type="button" onClick={handleDownload}>
            Download PNG
          </button>
        </div>
        <Scatter ref={chartRef} data={lorenzData} options={lorenzOptions} />
      </div>
    );
  }

  const isScatter = chartType === "scatter";
  const yearSet = new Set();
  datasets.forEach((dataset) => dataset.data.forEach((point) => yearSet.add(point.year)));
  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);

  const chartData = {
    ...(isScatter ? {} : { labels: sortedYears }),
    datasets: datasets.map((dset, index) => {
      const colors = palette[index % palette.length];
      if (isScatter) {
        const orderedPoints = [...dset.data].sort((a, b) => a.year - b.year);
        return {
          label: dset.country.toUpperCase(),
          data: orderedPoints.map(({ year, value }) => ({ x: year, y: value })),
          borderColor: colors.border,
          backgroundColor: colors.bg,
          showLine: false,
        };
      }

      const valueMap = dset.data.reduce((acc, item) => {
        acc[item.year] = item.value;
        return acc;
      }, {});

      return {
        label: dset.country.toUpperCase(),
        data: sortedYears.map((year) => valueMap[year] ?? null),
        borderColor: colors.border,
        backgroundColor: colors.bg,
        fill: false,
        tension: 0.25,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: axisColor } },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: isScatter ? "nearest" : "index", axis: "x", intersect: false },
    scales: isScatter
      ? {
          x: {
            title: { display: true, text: "Year" },
            type: "linear",
            ticks: { precision: 0, color: axisColor },
            grid: { color: gridColor },
          },
          y: { title: { display: true, text: "Value", color: axisColor }, ticks: { color: axisColor }, grid: { color: gridColor } },
        }
      : {
          x: { title: { display: true, text: "Year", color: axisColor }, ticks: { color: axisColor }, grid: { color: gridColor } },
          y: { title: { display: true, text: "Value", color: axisColor }, ticks: { color: axisColor }, grid: { color: gridColor } },
        },
  };

  const ChartComponent = chartType === "bar" ? Bar : chartType === "scatter" ? Scatter : Line;

  return (
    <div className="chart-card">
      <div className="flex items-center justify-end mb-2">
        <button className="btn-secondary" type="button" onClick={handleDownload}>
          Download PNG
        </button>
      </div>
      <ChartComponent ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
