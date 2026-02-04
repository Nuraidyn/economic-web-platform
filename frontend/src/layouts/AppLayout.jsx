import React, { useContext } from "react";
import { NavLink, Outlet } from "react-router-dom";

import AuthPanel from "../components/AuthPanel";
import AgreementPanel from "../components/AgreementPanel";
import Navbar from "../components/Navbar";
import SavedPresetsPanel from "../components/SavedPresetsPanel";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";

export default function AppLayout() {
  const { user } = useContext(AuthContext);
  const { presetPayload, applyPresetPayload } = useAnalysis();

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="page">
        <section className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          <aside className="space-y-6">
            <div className="panel">
              <h3 className="panel-title">Navigation</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <NavLink to="/" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
                  Dashboard
                </NavLink>
                <NavLink
                  to="/inequality"
                  className={({ isActive }) => (isActive ? "tab-active" : "tab")}
                >
                  Inequality
                </NavLink>
                <NavLink
                  to="/forecast"
                  className={({ isActive }) => (isActive ? "tab-active" : "tab")}
                >
                  Forecast
                </NavLink>
                <NavLink to="/saved" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
                  Saved
                </NavLink>
              </div>
            </div>

            <AuthPanel />
            <AgreementPanel />
            <SavedPresetsPanel user={user} currentPayload={presetPayload} onLoad={applyPresetPayload} />
          </aside>

          <div className="space-y-6 min-w-0">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
