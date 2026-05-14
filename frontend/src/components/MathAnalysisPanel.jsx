import React, { useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

import { fetchDerivative, fetchIntegral, fetchRawCorrelation } from "../api/analyticsApi";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

const ANALYSIS_TYPES = ["derivative", "integral", "correlation"];

function parseNumbers(str) {
  return str
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

function buildLineChart(labels, datasets) {
  return {
    labels,
    datasets,
  };
}

export default function MathAnalysisPanel({ canAccess }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const abortRef = useRef(null);

  const [analysisType, setAnalysisType] = useState("derivative");
  const [yearsRaw, setYearsRaw] = useState("");
  const [valuesRaw, setValuesRaw] = useState("");
  const [valuesBRaw, setValuesBRaw] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const axisColor = theme === "dark" ? "rgba(226,232,240,0.7)" : "rgba(15,23,42,0.66)";
  const gridColor = theme === "dark" ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.12)";

  const handleRun = async () => {
    const years = parseNumbers(yearsRaw);
    const values = parseNumbers(valuesRaw);

    if (years.length < 2 || values.length < 2 || years.length !== values.length) {
      setStatus({ loading: false, error: t("analysis.errorInput") });
      return;
    }

    if (analysisType === "correlation") {
      const valuesB = parseNumbers(valuesBRaw);
      if (valuesB.length < 2 || valuesB.length !== values.length) {
        setStatus({ loading: false, error: t("analysis.errorInput") });
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setStatus({ loading: true, error: "" });
    setResult(null);

    try {
      let data;
      if (analysisType === "derivative") {
        data = await fetchDerivative({ years, values }, signal);
      } else if (analysisType === "integral") {
        data = await fetchIntegral({ years, values }, signal);
      } else {
        const valuesB = parseNumbers(valuesBRaw);
        data = await fetchRawCorrelation({ years, values_a: values, values_b: valuesB }, signal);
      }
      if (signal.aborted) return;
      setResult({ type: analysisType, years, values, data });
      setStatus({ loading: false, error: "" });
    } catch (err) {
      if (signal.aborted) return;
      setStatus({ loading: false, error: t("analysis.errorFailed") });
    }
  };

  const chartData = (() => {
    if (!result) return null;

    if (result.type === "derivative") {
      return buildLineChart(result.data.years, [
        {
          label: t("analysis.valuesLabel"),
          data: result.values,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.15)",
          tension: 0.2,
          yAxisID: "yOrig",
        },
        {
          label: t("analysis.resultDerivative"),
          data: result.data.derivative,
          borderColor: "#fbbf24",
          backgroundColor: "rgba(251,191,36,0.15)",
          borderDash: [5, 5],
          tension: 0.2,
          yAxisID: "yDeriv",
        },
      ]);
    }

    if (result.type === "integral") {
      return buildLineChart(result.data.years, [
        {
          label: t("analysis.valuesLabel"),
          data: result.values,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.15)",
          tension: 0.2,
          yAxisID: "yOrig",
        },
        {
          label: t("analysis.resultIntegral"),
          data: result.data.cumulative,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167,139,250,0.15)",
          tension: 0.2,
          yAxisID: "yInteg",
        },
      ]);
    }

    return null;
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { color: axisColor } } },
    scales: {
      x: {
        ticks: { color: axisColor },
        title: { display: true, text: t("chart.year"), color: axisColor },
        grid: { color: gridColor },
      },
      yOrig: {
        type: "linear",
        position: "left",
        ticks: { color: axisColor },
        title: { display: true, text: t("chart.value"), color: axisColor },
        grid: { color: gridColor },
      },
      yDeriv: {
        type: "linear",
        position: "right",
        ticks: { color: "#fbbf24" },
        title: { display: true, text: t("analysis.resultDerivative"), color: "#fbbf24" },
        grid: { drawOnChartArea: false },
      },
      yInteg: {
        type: "linear",
        position: "right",
        ticks: { color: "#a78bfa" },
        title: { display: true, text: t("analysis.resultIntegral"), color: "#a78bfa" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <section className="panel-wide mt-8">
      <div>
        <h3 className="panel-title">{t("analysis.title")}</h3>
        <p className="text-sm text-muted mt-2 max-w-2xl">{t("analysis.subtitle")}</p>
      </div>

      <div className="mt-6 surface p-4 space-y-4">
        {/* Type selector */}
        <div>
          <label className="label">{t("analysis.typeLabel")}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setAnalysisType(type); setResult(null); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  analysisType === type
                    ? "bg-sky-500/20 border-sky-400/60 text-sky-300"
                    : "border-slate-700/40 text-muted hover:border-sky-400/40"
                }`}
              >
                {t(`analysis.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{t("analysis.yearsLabel")}</label>
            <input
              className="input font-mono text-xs"
              placeholder="2000, 2001, 2002, ..."
              value={yearsRaw}
              onChange={(e) => setYearsRaw(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {analysisType === "correlation" ? t("analysis.valuesALabel") : t("analysis.valuesLabel")}
            </label>
            <input
              className="input font-mono text-xs"
              placeholder="3.1, 3.4, 3.8, ..."
              value={valuesRaw}
              onChange={(e) => setValuesRaw(e.target.value)}
            />
          </div>
          {analysisType === "correlation" && (
            <div className="sm:col-span-2">
              <label className="label">{t("analysis.valuesBLabel")}</label>
              <input
                className="input font-mono text-xs"
                placeholder="5.2, 5.0, 4.7, ..."
                value={valuesBRaw}
                onChange={(e) => setValuesBRaw(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn-primary"
            type="button"
            onClick={handleRun}
            disabled={!canAccess}
          >
            {status.loading ? t("analysis.running") : t("analysis.run")}
          </button>
          {!canAccess && (
            <span className="text-xs text-amber-700/80 dark:text-amber-200/80">
              {t("forecast.needAgreement")}
            </span>
          )}
        </div>

        {status.error && (
          <p className="text-xs text-rose-300">{status.error}</p>
        )}
      </div>

      {/* Results */}
      {result && result.type === "correlation" && (
        <div className="mt-4 surface p-4 space-y-2">
          <p className="text-xs uppercase tracking-widest text-faint mb-3">
            {t("analysis.resultCorrelation")}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted">{t("analysis.correlation", { value: "" })}</p>
              <p className="text-2xl font-semibold mt-1">{result.data.correlation.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("analysis.pValue", { value: "" })}</p>
              <p className="text-2xl font-semibold mt-1">{result.data.p_value.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("analysis.points", { value: "" })}</p>
              <p className="text-2xl font-semibold mt-1">{result.data.points}</p>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-slate-800/40 dark:bg-slate-900/40 px-4 py-3 text-sm">
            <span className="text-xs text-faint uppercase tracking-widest mr-2">
              {t("analysis.interpretation")}
            </span>
            {result.data.interpretation}
          </div>
        </div>
      )}

      {result && result.type === "integral" && (
        <div className="mt-4 surface p-4">
          <p className="text-xs uppercase tracking-widest text-faint mb-1">
            {t("analysis.total", { value: result.data.total.toFixed(4) })}
          </p>
        </div>
      )}

      {chartData && (
        <div className="mt-4 chart-card">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </section>
  );
}
