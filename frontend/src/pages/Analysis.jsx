/**
 * AnalysisPage — vertical storytelling layout:
 *   1. Context (hero + notes)
 *   2. Filter panel (countries, year range, chart type)
 *   3. Charts (Gini trend + country ranking)
 *   4. Interpretation (insight cards + comparison table)
 *   5. AI Explain (requires agreement)
 */
import React, { useCallback, useContext, useMemo, useRef, useState } from "react";

import { fetchGiniRanking, fetchGiniTrend } from "../api/analyticsApi";
import ChartDisplay from "../components/ChartDisplay";
import ChartInsightAgent from "../components/ChartInsightAgent";
import CountryMultiSelect from "../components/CountryMultiSelect";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";

const MAX_INEQ_COUNTRIES = 6;

/* ── Per-country analytics computed from API points ─────── */
function computeStats(country, points) {
  const valid = (points || []).filter((p) => typeof p.value === "number");
  if (!valid.length) return { country, hasData: false };

  const first = valid[0];
  const last = valid[valid.length - 1];
  const delta = parseFloat((last.value - first.value).toFixed(3));
  const deltaPct = first.value !== 0 ? (delta / first.value) * 100 : null;

  const mean = valid.reduce((s, p) => s + p.value, 0) / valid.length;
  const volatility = Math.sqrt(
    valid.reduce((s, p) => s + (p.value - mean) ** 2, 0) / valid.length
  );

  // Use yoy_change from API for trend direction
  const recentYoy = (points || [])
    .filter((p) => typeof p.yoy_change === "number")
    .slice(-4)
    .map((p) => p.yoy_change);
  const avgYoy = recentYoy.length
    ? recentYoy.reduce((s, v) => s + v, 0) / recentYoy.length
    : 0;

  const trendDir = avgYoy > 0.25 ? "worsening" : avgYoy < -0.25 ? "improving" : "stable";

  return {
    country,
    hasData: true,
    latestYear: last.year,
    latestValue: last.value,
    firstYear: first.year,
    firstValue: first.value,
    delta,
    deltaPct,
    volatility,
    trendDir,
    riskFlag: avgYoy > 0.5,
    avgYoy,
  };
}

/* ── CSV export ─────────────────────────────────────────── */
function exportCsv(datasets, startYear, endYear) {
  const years = new Set();
  datasets.forEach((d) => d.data.forEach((p) => years.add(p.year)));
  const sorted = Array.from(years).sort((a, b) => a - b);
  const rows = [["year", ...datasets.map((d) => d.country)]];
  sorted.forEach((year) => {
    rows.push([year, ...datasets.map((d) => d.data.find((p) => p.year === year)?.value ?? "")]);
  });
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `analysis_${startYear}-${endYear}.csv`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ── Trend badge ─────────────────────────────────────────── */
function TrendBadge({ dir, t }) {
  if (dir === "worsening") return <span className="ineq-badge ineq-badge-risk">{t("gini.worsening")}</span>;
  if (dir === "improving") return <span className="ineq-badge ineq-badge-good">{t("gini.improving")}</span>;
  return <span className="ineq-badge ineq-badge-neutral">{t("gini.stable")}</span>;
}

/* ── Delta cell ─────────────────────────────────────────── */
function DeltaCell({ value, suffix = "" }) {
  if (value == null) return <span className="text-muted">—</span>;
  const positive = value > 0;
  return (
    <span className={positive ? "text-rose-400" : "text-emerald-400"}>
      {positive ? "+" : ""}{value.toFixed(2)}{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   AnalysisPage
═══════════════════════════════════════════════════════════ */
export default function AnalysisPage() {
  const { user } = useContext(AuthContext);
  const {
    countries,
    selectedCountries: globalCountries,
    startYear: globalStart,
    endYear: globalEnd,
    minAnalysisYear,
    maxAnalysisYear,
  } = useAnalysis();
  const { t } = useI18n();

  /* Local state — independent from Compare workspace */
  const [ineqCountries, setIneqCountries] = useState(() => globalCountries.slice(0, MAX_INEQ_COUNTRIES));
  const [startYear, setStartYear] = useState(globalStart);
  const [endYear, setEndYear] = useState(globalEnd);
  const [chartType, setChartType] = useState("line");
  const [selectionWarning, setSelectionWarning] = useState("");

  const [datasets, setDatasets] = useState([]);
  const [rankingData, setRankingData] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const chartsRef = useRef(null);
  const canAccess = Boolean(user?.agreement_accepted);

  /* Year dropdown */
  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = maxAnalysisYear; y >= minAnalysisYear; y--) opts.push(y);
    return opts;
  }, [minAnalysisYear, maxAnalysisYear]);

  /* ── Fetch gini trends + ranking ──────────────────────── */
  const loadData = useCallback(async () => {
    if (!canAccess) {
      setStatus({ loading: false, error: t("gini.errorNeedAgreement") });
      return;
    }
    if (!ineqCountries.length) {
      setStatus({ loading: false, error: t("gini.errorSelectCountry") });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const results = await Promise.all(
        ineqCountries.map(async (country) => {
          const payload = await fetchGiniTrend({ country, start_year: startYear, end_year: endYear });
          return {
            country,
            data: (payload.points || []).map((p) => ({
              year: p.year,
              value: p.value,
              yoy_change: p.yoy_change,
            })),
            meta: payload.meta,
          };
        })
      );
      setDatasets(results);

      // Ranking for end year (non-blocking)
      try {
        const ranking = await fetchGiniRanking({ year: endYear, countries: ineqCountries });
        setRankingData(ranking);
      } catch {
        setRankingData([]);
      }

      setStatus({ loading: false, error: "" });
      setTimeout(() => chartsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch {
      setStatus({ loading: false, error: t("gini.errorFailed") });
    }
  }, [canAccess, ineqCountries, startYear, endYear, t]);

  /* ── Derived data ─────────────────────────────────────── */
  const statsRows = useMemo(
    () => datasets.map((d) => computeStats(d.country, d.data)),
    [datasets]
  );

  // ChartDisplay expects [{country, data:[{year,value}]}]
  const chartDatasets = useMemo(
    () => datasets.map((d) => ({ country: d.country, data: d.data.map((p) => ({ year: p.year, value: p.value })) })),
    [datasets]
  );

  // Sorted ranking (descending Gini = most unequal first)
  const sortedRanking = useMemo(
    () => [...rankingData].filter((r) => r.value != null).sort((a, b) => b.value - a.value),
    [rankingData]
  );
  const rankingMax = useMemo(
    () => sortedRanking.reduce((m, r) => Math.max(m, r.value), 1),
    [sortedRanking]
  );

  // ChartInsightAgent expects [{indicator, series:[{country, data}]}]
  const aiDatasets = useMemo(
    () => [{
      indicator: "SI.POV.GINI",
      series: datasets.map((d) => ({
        country: d.country,
        data: d.data.map((p) => ({ year: p.year, value: p.value })),
      })),
    }],
    [datasets]
  );
  const aiIndicators = useMemo(
    () => [{ code: "SI.POV.GINI", name: "Gini Index", label: "Gini Index" }],
    []
  );

  const hasData = !status.loading && datasets.length > 0;
  const hasStats = statsRows.some((r) => r.hasData);

  return (
    <>
      {/* ══ 1. CONTEXT — Hero ═══════════════════════════════ */}
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("inequalityPage.heroKicker")}</p>
          <h2 className="hero-title">{t("inequalityPage.heroTitle")}</h2>
          <p className="hero-subtitle">{t("inequalityPage.heroSubtitle")}</p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">{t("inequalityPage.notesTitle")}</h3>
          <ul className="text-xs text-muted space-y-2">
            <li>{t("inequalityPage.note1")}</li>
            <li>{t("inequalityPage.note2")}</li>
          </ul>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* ══ 2. FILTER PANEL ══════════════════════════════════ */}
      <section className="panel-wide space-y-5">
        <div>
          <span className="page-section-kicker">{t("gini.filterKicker")}</span>
          <h3 className="panel-title mt-1">{t("gini.filterTitle")}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Country selector */}
          <CountryMultiSelect
            countries={countries}
            selected={ineqCountries}
            maxSelection={MAX_INEQ_COUNTRIES}
            onSelect={(next) => { setSelectionWarning(""); setIneqCountries(next); }}
            onLimitReached={setSelectionWarning}
          />

          {/* Year range + chart type */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
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
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t("home.chartType")}</label>
              <select className="input" value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <option value="line">{t("home.chartLine")}</option>
                <option value="bar">{t("home.chartBar")}</option>
                <option value="scatter">{t("home.chartScatter")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            className="btn-primary"
            onClick={loadData}
            disabled={status.loading}
            aria-busy={status.loading}
          >
            {status.loading ? t("gini.loading") : t("gini.load")}
          </button>
          <p className="text-xs text-muted">
            {t("gini.countSummary", { count: ineqCountries.length, max: MAX_INEQ_COUNTRIES })}
          </p>
        </div>

        {selectionWarning && (
          <p className="text-xs text-amber-700/90 dark:text-amber-200/90">{selectionWarning}</p>
        )}
        {status.error && (
          <p className="text-xs text-rose-200/90" role="alert">{status.error}</p>
        )}
      </section>

      {/* ══ 3. LOADING SKELETON ══════════════════════════════ */}
      {status.loading && (
        <section className="space-y-6 mt-2" aria-busy="true" aria-label={t("gini.loading")}>
          <div className="panel-wide space-y-4">
            <div className="skeleton skeleton-title w-52" />
            <div className="skeleton skeleton-block w-full" style={{ height: "clamp(20rem, 42vh, 36rem)" }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="panel space-y-3">
                <div className="skeleton skeleton-text w-16" />
                <div className="skeleton skeleton-title w-24" />
                <div className="skeleton skeleton-text w-32 opacity-60" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ 4. CHARTS ════════════════════════════════════════ */}
      {hasData && (
        <>
          <div className="section-divider" aria-hidden="true" ref={chartsRef} />

          <section className="space-y-6">
            {/* Main trend chart */}
            <div className="panel-wide">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="page-section-kicker">{t("gini.chartsKicker")}</span>
                  <h3 className="panel-title mt-1">{t("gini.title")}</h3>
                  <p className="text-xs text-muted mt-1">{t("gini.subtitle")}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  onClick={() => exportCsv(chartDatasets, startYear, endYear)}
                >
                  {t("gini.exportCsv")}
                </button>
              </div>
              <ChartDisplay
                datasets={chartDatasets}
                chartType={chartType}
                viewMode="timeSeries"
                appear
                indicatorLabel="Gini Index"
              />
            </div>

            {/* Ranking (horizontal bars) */}
            {sortedRanking.length > 1 && (
              <div className="panel-wide">
                <div className="mb-5">
                  <span className="page-section-kicker">{t("gini.rankingKicker")}</span>
                  <h3 className="panel-title mt-1">{t("gini.rankingTitle", { year: endYear })}</h3>
                  <p className="text-xs text-muted mt-1">{t("gini.rankingSubtitle")}</p>
                </div>
                <div className="space-y-2.5">
                  {sortedRanking.map((row, idx) => (
                    <div key={row.country} className="flex items-center gap-3">
                      <span className="text-[11px] text-faint w-5 text-right shrink-0 tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold w-9 shrink-0">{row.country}</span>
                      <div className="ineq-ranking-bar-track">
                        <div
                          className="ineq-ranking-bar-fill"
                          style={{ width: `${(row.value / rankingMax) * 100}%`, opacity: 0.6 + 0.4 * ((sortedRanking.length - idx) / sortedRanking.length) }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right shrink-0 tabular-nums">
                        {row.value.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-faint mt-4">{t("gini.rankingNote")}</p>
              </div>
            )}
          </section>

          {/* ══ 5. INTERPRETATION ═══════════════════════════════ */}
          {hasStats && (
            <>
              <div className="section-divider" aria-hidden="true" />

              <section className="space-y-6">
                <div>
                  <span className="page-section-kicker">{t("gini.insightsKicker")}</span>
                  <h3 className="panel-title mt-1">{t("gini.insightsTitle")}</h3>
                  <p className="text-xs text-muted mt-1">{t("gini.insightsSubtitle")}</p>
                </div>

                {/* Insight cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statsRows.map((row) => (
                    <div key={row.country} className="panel space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-faint font-semibold">
                          {row.country}
                        </p>
                        {row.hasData && <TrendBadge dir={row.trendDir} t={t} />}
                      </div>

                      {!row.hasData ? (
                        <p className="text-xs text-muted">{t("gini.noData")}</p>
                      ) : (
                        <>
                          {/* Latest value + period delta */}
                          <div className="flex items-end gap-5">
                            <div>
                              <p className="text-[11px] text-faint">{t("gini.insightLatest", { year: row.latestYear })}</p>
                              <p className="text-3xl font-semibold tracking-tight">{row.latestValue.toFixed(1)}</p>
                            </div>
                            {row.delta != null && (
                              <div className="pb-0.5">
                                <p className="text-[11px] text-faint">{t("gini.insightDelta", { from: row.firstYear, to: row.latestYear })}</p>
                                <p className={`text-sm font-medium ${row.delta > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                  {row.delta > 0 ? "+" : ""}{row.delta.toFixed(2)}
                                  {row.deltaPct != null && (
                                    <span className="text-xs text-faint ml-1">
                                      ({row.deltaPct > 0 ? "+" : ""}{row.deltaPct.toFixed(1)}%)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Volatility + risk flag */}
                          <div
                            className="flex gap-6 pt-2 mt-1"
                            style={{ borderTop: "1px solid var(--panel-border)" }}
                          >
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-faint">
                                {t("gini.insightVolatility")}
                              </p>
                              <p className="text-sm mt-0.5 tabular-nums">{row.volatility.toFixed(2)}</p>
                            </div>
                            {row.riskFlag && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-rose-400/80">
                                  {t("gini.insightRiskFlag")}
                                </p>
                                <p className="text-rose-400 text-sm mt-0.5">▲</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison table — only shown for 2+ countries with data */}
                {statsRows.filter((r) => r.hasData).length > 1 && (
                  <div className="panel-wide">
                    <h3 className="panel-title mb-4">{t("gini.tableTitle")}</h3>
                    <div className="overflow-x-auto">
                      <table className="ineq-table">
                        <thead>
                          <tr>
                            <th>{t("gini.tableCountry")}</th>
                            <th>{t("gini.tableLatest")}</th>
                            <th>{t("gini.tableFirst")}</th>
                            <th>{t("gini.tableDelta")}</th>
                            <th>{t("gini.tableDeltaPct")}</th>
                            <th>{t("gini.tableVolatility")}</th>
                            <th>{t("gini.tableTrend")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsRows
                            .filter((r) => r.hasData)
                            .sort((a, b) => (b.latestValue ?? 0) - (a.latestValue ?? 0))
                            .map((row) => (
                              <tr key={row.country}>
                                <td>
                                  <span className="font-medium">{row.country}</span>
                                  {row.riskFlag && (
                                    <span
                                      className="ml-2 text-rose-400 text-xs"
                                      title={t("gini.insightRiskFlag")}
                                    >
                                      ⚠
                                    </span>
                                  )}
                                </td>
                                <td className="tabular-nums font-semibold">
                                  {row.latestValue?.toFixed(2) ?? "—"}
                                </td>
                                <td className="tabular-nums text-muted">
                                  {row.firstValue?.toFixed(2) ?? "—"}
                                </td>
                                <td className="tabular-nums">
                                  <DeltaCell value={row.delta} />
                                </td>
                                <td className="tabular-nums">
                                  <DeltaCell value={row.deltaPct} suffix="%" />
                                </td>
                                <td className="tabular-nums text-muted">
                                  {row.volatility?.toFixed(2) ?? "—"}
                                </td>
                                <td>
                                  <TrendBadge dir={row.trendDir} t={t} />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ══ 6. AI EXPLAIN ════════════════════════════════════ */}
          <div className="section-divider" aria-hidden="true" />
          <ChartInsightAgent
            datasets={aiDatasets}
            indicators={aiIndicators}
            startYear={startYear}
            endYear={endYear}
          />
        </>
      )}
    </>
  );
}
