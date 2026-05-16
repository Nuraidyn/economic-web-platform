import React, { useContext, useEffect } from "react";
import { Outlet } from "react-router-dom";

import AgreementPanel from "../components/AgreementPanel";
import AuthModal from "../components/AuthModal";
import ErrorBoundary from "../components/ErrorBoundary";
import Navbar from "../components/Navbar";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";
import { LINKS } from "../constants";

export default function AppLayout() {
  const { user, authStatus } = useContext(AuthContext);
  const { t } = useI18n();
  const { authModalOpen, openAuthModal, closeAuthModal } = useUI();

  // Auto-open auth modal when session expires (JWT 401 on app load)
  useEffect(() => {
    if (authStatus.expired && !authModalOpen) {
      openAuthModal();
    }
  }, [authStatus.expired, authModalOpen, openAuthModal]);

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <Navbar onOpenAuth={openAuthModal} isAuthenticated={Boolean(user)} />
      <main className="page !max-w-[1480px]">
        <div className="space-y-6 min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <footer className="max-w-[1480px] mx-auto w-full px-6 pb-10 space-y-6">
        <section className="panel">
          <h3 className="panel-title">{t("footer.referencesTitle")}</h3>
          <p className="text-xs text-muted mt-2">{t("footer.referencesSubtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="tab"
              href={LINKS.worldBank}
              target="_blank"
              rel="noreferrer"
            >
              {t("navbar.worldBank")}
            </a>
            <a
              className="tab"
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
            >
              {t("navbar.labNotes")}
            </a>
          </div>
        </section>
        <div>
          <AgreementPanel />
        </div>
      </footer>
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </div>
  );
}
