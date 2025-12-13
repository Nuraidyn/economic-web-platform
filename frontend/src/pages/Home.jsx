import React, { useEffect, useState } from "react";
import { fetchIndicator, fetchLorenzSegments } from "../api/worldBankAPI";
import CountryMultiSelect from "../components/CountryMultiSelect";
import IndicatorSelector from "../components/IndicatorSelector";
import ChartDisplay from "../components/ChartDisplay";
import FilterPanel from "../components/FilterPanel";

export default function Home() {
  const currentYear = new Date().getFullYear();
  const defaultStartYear = Math.max(1960, currentYear - 10);
  const [countries, setCountries] = useState([]);
  const [indicator, setIndicator] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [startYear, setStartYear] = useState(defaultStartYear);
  const [endYear, setEndYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState("timeSeries");
  const [lorenzYear, setLorenzYear] = useState(currentYear - 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDatasets([]);
    setError("");
  }, [viewMode]);

  const buildLorenzPoints = (segments) => {
    let cumulativePopulation = 0;
    let cumulativeIncome = 0;
    const points = [{ x: 0, y: 0 }];

    segments.forEach((segment) => {
      const incomeShare = typeof segment.incomeShare === "number" ? segment.incomeShare / 100 : 0;
      cumulativePopulation = Number((cumulativePopulation + segment.populationShare).toFixed(4));
      cumulativeIncome = Number((cumulativeIncome + incomeShare).toFixed(4));
      points.push({ x: cumulativePopulation, y: cumulativeIncome });
    });

    return points;
  };

  const fetchLorenzData = async () => {
    const requests = countries.map(async (countryCode) => {
      const segments = await fetchLorenzSegments(countryCode, lorenzYear);
      const missing = segments.filter((segment) => segment.incomeShare == null);
      if (missing.length > 0) {
        throw new Error(
          `No Lorenz data for ${countryCode.toUpperCase()} in ${lorenzYear}. Try another year.`
        );
      }
      const points = buildLorenzPoints(segments);
      const resolvedYear = segments.find((segment) => segment.dataYear)?.dataYear ?? lorenzYear;
      return { country: countryCode, data: points, year: resolvedYear };
    });

    return Promise.all(requests);
  };

  const handleFetch = async () => {
    if (countries.length === 0) {
      setError("Please select at least one country.");
      return;
    }

    if (viewMode === "timeSeries" && !indicator) {
      setError("Select an indicator for the time-series view.");
      return;
    }

    if (viewMode === "timeSeries" && startYear > endYear) {
      setError("Start year must be less than or equal to end year.");
      return;
    }

    if (viewMode === "lorenz" && (Number.isNaN(lorenzYear) || lorenzYear < 1960)) {
      setError("Lorenz year must be 1960 or later.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      if (viewMode === "lorenz") {
        const lorenzDatasets = await fetchLorenzData();
        setDatasets(lorenzDatasets);
      } else {
        const allData = await Promise.all(
          countries.map(async (countryCode) => {
            const data = await fetchIndicator(countryCode, indicator, {
              start: startYear,
              end: endYear,
            });
            return { country: countryCode, data };
          })
        );
        setDatasets(allData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Analyze the Lorenz Curve &amp; Gini Index
        </h2>
        <p className="text-slate-500">
          Select countries, inequality indicators, and a time range to examine income concentration trends.
        </p>
      </div>

      <CountryMultiSelect onSelect={setCountries} />
      <IndicatorSelector onSelect={setIndicator} disabled={viewMode === "lorenz"} />
      <FilterPanel
        chartType={chartType}
        setChartType={setChartType}
        startYear={startYear}
        endYear={endYear}
        setStartYear={setStartYear}
        setEndYear={setEndYear}
        viewMode={viewMode}
        setViewMode={setViewMode}
        lorenzYear={lorenzYear}
        setLorenzYear={setLorenzYear}
      />

      <button
        onClick={handleFetch}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:bg-blue-300"
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Fetch Data"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <ChartDisplay datasets={datasets} chartType={chartType} viewMode={viewMode} />
    </main>
  );
}
