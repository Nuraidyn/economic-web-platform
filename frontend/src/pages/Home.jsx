import React, { useMemo, useState } from "react";

import { fetchObservationsWithMeta } from "../api/analyticsApi";
import ChartInsightAgent from "../components/ChartInsightAgent";
import ComparisonDashboard from "../components/ComparisonDashboard";
import CountryMultiSelect from "../components/CountryMultiSelect";
import IndicatorMultiSelect from "../components/IndicatorMultiSelect";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";

const MAX_COUNTRIES = 4;
const MAX_INDICATORS = 4;

export default function Home() {
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

  const runComparison = async () => {
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
      const data = [];
      for (const indicator of selectedIndicators) {
        const series = [];
        for (const country of selectedCountries) {
          const payload = await fetchObservationsWithMeta({
            country,
            indicator,
            start_year: startYear,
            end_year: endYear,
          });
          series.push({ country, data: payload.data, meta: payload.meta });
        }
        data.push({ indicator, series });
      }
      setDatasets(data);
    } catch (err) {
      setError(t("home.errorLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("home.heroKicker")}</p>
          <h2 className="hero-title">{t("home.heroTitle")}</h2>
          <p className="hero-subtitle">
            {t("home.heroSubtitle")}
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">{t("home.dataAssurance")}</h3>
          <ul className="text-xs text-muted space-y-2">
            <li>{t("home.dataSourceItem")}</li>
            <li>{t("home.dataHistoryItem")}</li>
            <li>{t("home.dataMissingItem")}</li>
          </ul>
        </div>
      </section>

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
            <select className="input" value={chartType} onChange={(event) => setChartType(event.target.value)}>
              {chartTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("home.startYear")}</label>
            <select
              className="input"
              value={startYear}
              onChange={(event) => {
                const nextStart = Number(event.target.value);
                setStartYear(nextStart);
                if (nextStart > endYear) {
                  setEndYear(nextStart);
                }
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("home.endYear")}</label>
            <select
              className="input"
              value={endYear}
              onChange={(event) => {
                const nextEnd = Number(event.target.value);
                setEndYear(nextEnd);
                if (nextEnd < startYear) {
                  setStartYear(nextEnd);
                }
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2">
          {t("home.availableYearRange", { min: minAnalysisYear, max: maxAnalysisYear })}
        </p>
        <div className="flex items-center justify-between mt-6">
          <button className="btn-primary" type="button" onClick={runComparison}>
            {isLoading ? t("home.loading") : t("home.runComparison")}
          </button>
          <div className="text-xs text-muted">
            {t("home.countSummary", { countries: selectedCountries.length, indicators: selectedIndicators.length })}
          </div>
        </div>
        {(catalogStatus.error || error) && (
          <p className="text-xs text-rose-200/90 mt-3">{catalogStatus.error || error}</p>
        )}
        {selectionWarning && (
          <p className="text-xs text-amber-700/90 dark:text-amber-200/90 mt-2">{selectionWarning}</p>
        )}
      </section>

      <ComparisonDashboard datasets={datasets} chartType={chartType} correlationPair={correlationPair} indicators={indicators} />
      <ChartInsightAgent
        datasets={datasets}
        indicators={indicators}
        startYear={startYear}
        endYear={endYear}
      />
    </>
  );
}
