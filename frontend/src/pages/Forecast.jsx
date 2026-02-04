import React, { useContext } from "react";

import ForecastPanel from "../components/ForecastPanel";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";

export default function ForecastPage() {
  const { user } = useContext(AuthContext);
  const { countries, indicators, selectedCountries, selectedIndicators } = useAnalysis();

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">Forecast</p>
          <h2 className="hero-title">Generate transparent baseline forecasts.</h2>
          <p className="hero-subtitle">
            Forecasts include confidence bands and backtesting metrics (MAE/RMSE) for defensible interpretation.
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">Access</h3>
          <p className="text-xs text-slate-200/70 mt-2">
            Agreement acceptance is required to access forecasting endpoints.
          </p>
        </div>
      </section>

      <ForecastPanel
        canAccess={Boolean(user?.agreement_accepted)}
        countries={countries}
        indicators={indicators}
        defaultCountry={selectedCountries[0] || ""}
        defaultIndicator={selectedIndicators[0] || ""}
      />
    </>
  );
}

