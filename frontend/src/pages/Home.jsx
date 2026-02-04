import React, { useContext, useEffect, useMemo, useState } from "react";

import { fetchObservations, listCountries, listIndicators } from "../api/analyticsApi";
import AuthContext from "../context/AuthContext";
import { DEFAULT_COUNTRIES, DEFAULT_INDICATORS } from "../data/indicatorCatalog";
import AgreementPanel from "../components/AgreementPanel";
import AuthPanel from "../components/AuthPanel";
import ComparisonDashboard from "../components/ComparisonDashboard";
import CountryMultiSelect from "../components/CountryMultiSelect";
import ForecastPanel from "../components/ForecastPanel";
import IndicatorMultiSelect from "../components/IndicatorMultiSelect";
import SavedPresetsPanel from "../components/SavedPresetsPanel";

const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "scatter", label: "Scatter" },
];

export default function Home() {
  const { user } = useContext(AuthContext);
  const currentYear = new Date().getFullYear();
  const [countries, setCountries] = useState(DEFAULT_COUNTRIES);
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [startYear, setStartYear] = useState(Math.max(1990, currentYear - 20));
  const [endYear, setEndYear] = useState(currentYear - 1);
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const presetPayload = useMemo(
    () => ({
      selectedCountries,
      selectedIndicators,
      chartType,
      startYear,
      endYear,
    }),
    [selectedCountries, selectedIndicators, chartType, startYear, endYear]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [countriesData, indicatorData] = await Promise.all([
          listCountries(),
          listIndicators(),
        ]);
        if (countriesData.length) {
          setCountries(countriesData);
        }
        if (indicatorData.length) {
          const mapped = indicatorData.map((item) => ({
            code: item.code,
            label: item.name || item.code,
          }));
          setIndicators((prev) => {
            const merged = new Map(prev.map((entry) => [entry.code, entry]));
            mapped.forEach((entry) => merged.set(entry.code, entry));
            return Array.from(merged.values());
          });
        }
      } catch (err) {
        setError("Catalog service is unavailable. Using default lists.");
      }
    };

    loadCatalog();
  }, []);

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
              const payload = await fetchObservations({
                country,
                indicator,
                start_year: startYear,
                end_year: endYear,
              });
              return { country, data: payload };
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
    <main className="page">
      <section className="hero">
        <div>
          <p className="hero-kicker">Diploma research workspace</p>
          <h2 className="hero-title">Compare inequality with macroeconomic pressure points.</h2>
          <p className="hero-subtitle">
            Normalize indicators across countries, align timelines, and explore correlations between
            inequality and growth, inflation, or unemployment. Forecasts are explicitly labeled as
            probabilistic.
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">Data assurance</h3>
          <ul className="text-xs text-slate-200/70 space-y-2">
            <li>Source: World Bank catalog + planned IMF/OECD ingestion.</li>
            <li>Historical vs derived vs forecast values are separated.</li>
            <li>Missing data is preserved and surfaced for transparency.</li>
          </ul>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="space-y-6">
          <AuthPanel />
          <AgreementPanel />
          <SavedPresetsPanel
            user={user}
            currentPayload={presetPayload}
            onLoad={(payload) => {
              if (payload.selectedCountries) setSelectedCountries(payload.selectedCountries);
              if (payload.selectedIndicators) setSelectedIndicators(payload.selectedIndicators);
              if (payload.chartType) setChartType(payload.chartType);
              if (typeof payload.startYear === "number") setStartYear(payload.startYear);
              if (typeof payload.endYear === "number") setEndYear(payload.endYear);
            }}
          />
        </div>
        <div className="panel">
          <h3 className="panel-title">Comparison Controls</h3>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <CountryMultiSelect
              countries={countries}
              selected={selectedCountries}
              onSelect={setSelectedCountries}
            />
            <IndicatorMultiSelect
              indicators={indicators}
              selected={selectedIndicators}
              onChange={setSelectedIndicators}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                Chart Type
              </label>
              <select
                className="input"
                value={chartType}
                onChange={(event) => setChartType(event.target.value)}
              >
                {CHART_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                Start Year
              </label>
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
              <label className="block text-xs uppercase tracking-widest text-slate-200/80">
                End Year
              </label>
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
            <div className="text-xs text-slate-200/70">
              {selectedCountries.length} countries · {selectedIndicators.length} indicators
            </div>
          </div>
          {error && <p className="text-xs text-rose-200/90 mt-3">{error}</p>}
        </div>
      </section>

      <ComparisonDashboard
        datasets={datasets}
        chartType={chartType}
        correlationPair={correlationPair}
        indicators={indicators}
      />

      <ForecastPanel
        canAccess={Boolean(user?.agreement_accepted)}
        countries={countries}
        indicators={indicators}
        defaultCountry={selectedCountries[0] || ""}
        defaultIndicator={selectedIndicators[0] || ""}
      />
    </main>
  );
}
