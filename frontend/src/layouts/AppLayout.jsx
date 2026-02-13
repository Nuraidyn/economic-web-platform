import React, { useContext, useState } from "react";
import { Outlet } from "react-router-dom";

import AgreementPanel from "../components/AgreementPanel";
import AuthModal from "../components/AuthModal";
import Navbar from "../components/Navbar";
import SavedPresetsPanel from "../components/SavedPresetsPanel";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";

export default function AppLayout() {
  const { user } = useContext(AuthContext);
  const { presetPayload, applyPresetPayload } = useAnalysis();
  const { t } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} isAuthenticated={Boolean(user)} />
      <main className="page !max-w-[1480px]">
        <div className="space-y-6 min-w-0">
          <Outlet />
        </div>
      </main>
      <footer className="max-w-[1480px] mx-auto w-full px-6 pb-10 space-y-6">
        <section className="panel">
          <h3 className="panel-title">{t("footer.referencesTitle")}</h3>
          <p className="text-xs text-muted mt-2">{t("footer.referencesSubtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="tab"
              href="https://data.worldbank.org/indicator"
              target="_blank"
              rel="noreferrer"
            >
              {t("navbar.worldBank")}
            </a>
            <a
              className="tab"
              href="https://github.com/nuraidynseitkapar1"
              target="_blank"
              rel="noreferrer"
            >
              {t("navbar.labNotes")}
            </a>
          </div>
        </section>
        <div className="grid lg:grid-cols-2 gap-6">
          <AgreementPanel />
          <SavedPresetsPanel user={user} currentPayload={presetPayload} onLoad={applyPresetPayload} />
        </div>
      </footer>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
