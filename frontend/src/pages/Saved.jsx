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
      <section className="panel-wide">
        <span className="page-section-kicker">{t("layout.saved")}</span>
        <h3 className="panel-title" style={{ fontSize: "1.5rem", marginTop: "0.25rem" }}>
          {t("savedPage.title")}
        </h3>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          {t("savedPage.subtitle")}
        </p>
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
