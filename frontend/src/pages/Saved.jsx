import React, { useContext } from "react";

import SavedPresetsPanel from "../components/SavedPresetsPanel";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";

export default function SavedPage() {
  const { t } = useI18n();
  const { user } = useContext(AuthContext);
  const { presetPayload, applyPresetPayload } = useAnalysis();

  return (
    <>
      <section
        className="panel-wide relative overflow-hidden"
        style={{ borderColor: "var(--panel-border-strong)" }}
      >
        {/* Accent background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
            background:
              "radial-gradient(ellipse 55% 70% at 95% 5%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div className="relative z-10">
          <span className="page-section-kicker">{t("layout.saved")}</span>
          <h1
            className="panel-title mt-1"
            style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.025em" }}
          >
            {t("savedPage.title")}
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl" style={{ lineHeight: "1.65" }}>
            {t("savedPage.subtitle")}
          </p>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      <SavedPresetsPanel
        user={user}
        currentPayload={presetPayload}
        onLoad={applyPresetPayload}
      />
    </>
  );
}
