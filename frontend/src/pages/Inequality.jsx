import React, { useContext } from "react";

import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import GiniTrendPanel from "../components/GiniTrendPanel";

export default function InequalityPage() {
  const { user } = useContext(AuthContext);
  const { selectedCountries, startYear, endYear, chartType } = useAnalysis();

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">Inequality analytics</p>
          <h2 className="hero-title">Track inequality trends across time.</h2>
          <p className="hero-subtitle">
            Explore Gini trends, year-over-year shifts, and compare trajectories across selected countries.
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">Notes</h3>
          <ul className="text-xs text-slate-200/70 space-y-2">
            <li>Server-side enforcement: agreement required.</li>
            <li>Sources are surfaced for transparency.</li>
          </ul>
        </div>
      </section>

      <GiniTrendPanel
        canAccess={Boolean(user?.agreement_accepted)}
        countries={selectedCountries}
        startYear={startYear}
        endYear={endYear}
        chartType={chartType}
      />
    </>
  );
}

