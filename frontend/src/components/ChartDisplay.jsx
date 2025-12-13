import { Line, Bar, Scatter } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

const palette = [
  { border: "#2563eb", bg: "rgba(37,99,235,0.3)" },
  { border: "#dc2626", bg: "rgba(220,38,38,0.3)" },
  { border: "#16a34a", bg: "rgba(22,163,74,0.3)" },
  { border: "#9333ea", bg: "rgba(147,51,234,0.3)" },
  { border: "#eab308", bg: "rgba(234,179,8,0.3)" },
];

export default function ChartDisplay({ datasets, chartType, viewMode }) {
  if (!datasets || datasets.length === 0) {
    return <p className="text-gray-500 text-center mt-4">Select filters and fetch data.</p>;
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
        legend: { position: "bottom" },
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
          },
          title: { display: true, text: "Cumulative population share" },
        },
        y: {
          type: "linear",
          min: 0,
          max: 1,
          ticks: {
            callback: (value) => `${value * 100}%`,
          },
          title: { display: true, text: "Cumulative income share" },
        },
      },
    };

    return (
      <div className="bg-white p-4 shadow-lg rounded-lg mt-6 h-96">
        <Scatter data={lorenzData} options={lorenzOptions} />
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
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: isScatter ? "nearest" : "index", axis: "x", intersect: false },
    scales: isScatter
      ? {
          x: {
            title: { display: true, text: "Year" },
            type: "linear",
            ticks: { precision: 0 },
          },
          y: { title: { display: true, text: "Value" } },
        }
      : {
          x: { title: { display: true, text: "Year" } },
          y: { title: { display: true, text: "Value" } },
        },
  };

  const ChartComponent = chartType === "bar" ? Bar : chartType === "scatter" ? Scatter : Line;

  return (
    <div className="bg-white p-4 shadow-lg rounded-lg mt-6 h-96">
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}
