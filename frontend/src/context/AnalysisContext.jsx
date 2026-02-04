import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { listCountries, listIndicators } from "../api/analyticsApi";
import { DEFAULT_COUNTRIES, DEFAULT_INDICATORS } from "../data/indicatorCatalog";

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const currentYear = new Date().getFullYear();

  const [countries, setCountries] = useState(DEFAULT_COUNTRIES);
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS);
  const [catalogStatus, setCatalogStatus] = useState({ loading: true, error: "" });

  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [startYear, setStartYear] = useState(Math.max(1990, currentYear - 20));
  const [endYear, setEndYear] = useState(currentYear - 1);

  const loadCatalog = useCallback(async () => {
    setCatalogStatus({ loading: true, error: "" });
    try {
      const [countriesData, indicatorData] = await Promise.all([listCountries(), listIndicators()]);
      if (Array.isArray(countriesData) && countriesData.length) {
        setCountries(countriesData);
      }
      if (Array.isArray(indicatorData) && indicatorData.length) {
        const mapped = indicatorData.map((item) => ({ code: item.code, label: item.name || item.code }));
        setIndicators((prev) => {
          const merged = new Map(prev.map((entry) => [entry.code, entry]));
          mapped.forEach((entry) => merged.set(entry.code, entry));
          return Array.from(merged.values());
        });
      }
      setCatalogStatus({ loading: false, error: "" });
    } catch (err) {
      setCatalogStatus({ loading: false, error: "Catalog service is unavailable. Using default lists." });
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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

  const applyPresetPayload = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return;
    if (Array.isArray(payload.selectedCountries)) setSelectedCountries(payload.selectedCountries);
    if (Array.isArray(payload.selectedIndicators)) setSelectedIndicators(payload.selectedIndicators);
    if (typeof payload.chartType === "string") setChartType(payload.chartType);
    if (typeof payload.startYear === "number") setStartYear(payload.startYear);
    if (typeof payload.endYear === "number") setEndYear(payload.endYear);
  }, []);

  const value = useMemo(
    () => ({
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
      presetPayload,
      applyPresetPayload,
      reloadCatalog: loadCatalog,
    }),
    [
      countries,
      indicators,
      catalogStatus,
      selectedCountries,
      selectedIndicators,
      chartType,
      startYear,
      endYear,
      presetPayload,
      applyPresetPayload,
      loadCatalog,
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error("useAnalysis must be used within AnalysisProvider");
  }
  return ctx;
}

export default AnalysisContext;

