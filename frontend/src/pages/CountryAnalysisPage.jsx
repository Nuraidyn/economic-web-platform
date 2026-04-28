import React, { useCallback, useMemo, useState } from "react";

import { fetchObservationsWithMeta } from "../api/analyticsApi";
import ChartInsightAgent from "../components/ChartInsightAgent";
import ComparisonDashboard from "../components/ComparisonDashboard";
import CountryMultiSelect from "../components/CountryMultiSelect";
import IndicatorMultiSelect from "../components/IndicatorMultiSelect";
import PresetDrawer from "../components/PresetDrawer";
import WorkspaceActionBar from "../components/WorkspaceActionBar";
import AIInsightPreview from "../components/landing/AIInsightPreview";
import AnalyticsPreview from "../components/landing/AnalyticsPreview";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";
import { MAX_COUNTRIES, MAX_INDICATORS } from "../constants";

export default function CountryAnalysisPage() {
  const { t } = useI18n();
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
    minAnalysisYear,
    maxAnalysisYear,
  } = useAnalysis();

  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectionWarning, setSelectionWarning] = useState("");
  const [presetDrawerOpen, setPresetDrawerOpen] = useState(false);

  const chartTypes = useMemo(
    () => [
      { value: "line", label: t("home.chartLine") },
      { value: "bar", label: t("home.chartBar") },
      { value: "scatter", label: t("home.chartScatter") },
    ],
    [t]
  );

  const correlationPair = useMemo(() => {
    if (selectedIndicators.length >= 2) {
      return [selectedIndicators[0], selectedIndicators[1]];
    }
    return [];
  }, [selectedIndicators]);

  const yearOptions = useMemo(() => {
    const options = [];
    for (let year = maxAnalysisYear; year >= minAnalysisYear; year -= 1) {
      options.push(year);
    }
    return options;
  }, [minAnalysisYear, maxAnalysisYear]);

  const runComparison = useCallback(async () => {
    if (!selectedCountries.length || !selectedIndicators.length) {
      setError(t("home.errorSelectMin"));
      return;
    }
    if (selectedCountries.length > MAX_COUNTRIES || selectedIndicators.length > MAX_INDICATORS) {
      setError(t("home.errorTooManySelection", { countries: MAX_COUNTRIES, indicators: MAX_INDICATORS }));
      return;
    }
    if (startYear > endYear) {
      setError(t("home.errorStartEnd"));
      return;
    }
    if (startYear < minAnalysisYear || endYear > maxAnalysisYear) {
      setError(t("home.errorYearRange", { min: minAnalysisYear, max: maxAnalysisYear }));
      return;
    }
    setError("");
    setSelectionWarning("");
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
      const hasEmpty = data.some((entry) => entry.series.some((s) => s.meta?.empty));
      if (hasEmpty) {
        setSelectionWarning(t("home.warningNoData"));
      }
    } catch {
      setError(t("home.errorLoad"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountries, selectedIndicators, startYear, endYear, minAnalysisYear, maxAnalysisYear, t]);

  return (
    <>
      <WorkspaceActionBar onOpenDrawer={() => setPresetDrawerOpen(true)} />

      <AnalyticsPreview>
        <section className="panel">
          <h3 className="panel-title">{t("home.controlsTitle")}</h3>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <CountryMultiSelect
              countries={countries}
              selected={selectedCountries}
              maxSelection={MAX_COUNTRIES}
              onSelect={(next) => {
                setSelectionWarning("");
                setSelectedCountries(next);
              }}
              onLimitReached={setSelectionWarning}
            />
            <IndicatorMultiSelect
              indicators={indicators}
              selected={selectedIndicators}
              maxSelection={MAX_INDICATORS}
              onChange={(next) => {
                setSelectionWarning("");
                setSelectedIndicators(next);
              }}
              onLimitReached={setSelectionWarning}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="label">{t("home.chartType")}</label>
              <select
                className="input"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                {chartTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("home.startYear")}</label>
              <select
                className="input"
                value={startYear}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStartYear(v);
                  if (v > endYear) setEndYear(v);
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("home.endYear")}</label>
              <select
                className="input"
                value={endYear}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEndYear(v);
                  if (v < startYear) setStartYear(v);
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-2">
            {t("home.availableYearRange", { min: minAnalysisYear, max: maxAnalysisYear })}
          </p>
          <div className="flex items-center justify-between mt-6">
            <button
              className="btn-primary"
              type="button"
              onClick={runComparison}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? t("home.loading") : t("home.runComparison")}
            </button>
            <div className="text-xs text-muted">
              {t("home.countSummary", {
                countries: selectedCountries.length,
                indicators: selectedIndicators.length,
              })}
            </div>
          </div>
          {(catalogStatus.error || error) && (
            <p className="text-xs text-rose-200/90 mt-3" role="alert">
              {catalogStatus.error || error}
            </p>
          )}
          {selectionWarning && (
            <p className="text-xs text-amber-700/90 dark:text-amber-200/90 mt-2" role="status">
              {selectionWarning}
            </p>
          )}
        </section>

        <ComparisonDashboard
          datasets={datasets}
          chartType={chartType}
          correlationPair={correlationPair}
          indicators={indicators}
          isLoading={isLoading}
        />
      </AnalyticsPreview>

      <div className="section-divider" aria-hidden="true" />

      <AIInsightPreview>
        <ChartInsightAgent
          datasets={datasets}
          indicators={indicators}
          startYear={startYear}
          endYear={endYear}
        />
      </AIInsightPreview>

      <PresetDrawer
        isOpen={presetDrawerOpen}
        onClose={() => setPresetDrawerOpen(false)}
      />
    </>
  );
}
