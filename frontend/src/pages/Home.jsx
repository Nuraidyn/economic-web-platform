import React, { useContext, useMemo, useState } from "react";

import AuthContext from "../context/AuthContext";
import { fetchObservationsWithMeta } from "../api/analyticsApi";
import ComparisonDashboard from "../components/ComparisonDashboard";
import CountryMultiSelect from "../components/CountryMultiSelect";
import IndicatorMultiSelect from "../components/IndicatorMultiSelect";
import { useAnalysis } from "../context/AnalysisContext";

const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "scatter", label: "Scatter" },
];

export default function Home() {
  const currentYear = new Date().getFullYear();
  const { user } = useContext(AuthContext);
  const {
    countries,
    indicators,
    catalogStatus,
    selectedCountries,
    setSelectedCountries,
    selectedIndicators,
    setSelectedIndicators,
    chartType,
    setChartType,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
  } = useAnalysis();
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const correlationPair = useMemo(() => {
    if (selectedIndicators.length >= 2) {
      return [selectedIndicators[0], selectedIndicators[1]];
    }
    return [];
  }, [selectedIndicators]);

  const runComparison = async () => {
    if (!selectedCountries.length || !selectedIndicators.length) {
      setError("Select at least one country and one indicator.");
      return;
    }
    if (startYear > endYear) {
      setError("Start year must be less than or equal to end year.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const data = await Promise.all(
        selectedIndicators.map(async (indicator) => {
          const series = await Promise.all(
            selectedCountries.map(async (country) => {
              const payload = await fetchObservationsWithMeta({
                country,
                indicator,
                start_year: startYear,
                end_year: endYear,
              });
              return { country, data: payload.data, meta: payload.meta };
            })
          );
          return { indicator, series };
        })
      );
      setDatasets(data);
    } catch (err) {
      setError("Failed to load analytics. Check that FastAPI service is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">Dashboard</p>
          <h2 className="hero-title">Compare inequality with macroeconomic pressure points.</h2>
          <p className="hero-subtitle">
            Normalize indicators across countries, align timelines, and explore correlations between inequality and growth, inflation, or unemployment.
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">Data assurance</h3>
          <ul className="text-xs text-muted space-y-2">
            <li>Source: World Bank catalog + planned IMF/OECD ingestion.</li>
            <li>Historical vs derived vs forecast values are separated.</li>
            <li>Missing data is preserved and surfaced for transparency.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Comparison Controls</h3>
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <CountryMultiSelect countries={countries} selected={selectedCountries} onSelect={setSelectedCountries} />
          <IndicatorMultiSelect indicators={indicators} selected={selectedIndicators} onChange={setSelectedIndicators} />
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="label">Chart Type</label>
            <select className="input" value={chartType} onChange={(event) => setChartType(event.target.value)}>
              {CHART_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start Year</label>
            <input
              className="input"
              type="number"
              min="1960"
              max={currentYear}
              value={startYear}
              onChange={(event) => setStartYear(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="label">End Year</label>
            <input
              className="input"
              type="number"
              min="1960"
              max={currentYear}
              value={endYear}
              onChange={(event) => setEndYear(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <button className="btn-primary" type="button" onClick={runComparison}>
            {isLoading ? "Loading..." : "Run comparison"}
          </button>
          <div className="text-xs text-muted">
            {selectedCountries.length} countries · {selectedIndicators.length} indicators
          </div>
        </div>
        {(catalogStatus.error || error) && (
          <p className="text-xs text-rose-200/90 mt-3">{catalogStatus.error || error}</p>
        )}
      </section>

      <ComparisonDashboard datasets={datasets} chartType={chartType} correlationPair={correlationPair} indicators={indicators} />
    </>
  );
}
