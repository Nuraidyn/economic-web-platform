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
      <footer className="max-w-[1480px] mx-auto w-full px-4 md:px-6 pb-12 space-y-4">

        {/* ── Divider ── */}
        <div className="section-divider" aria-hidden="true" />

        {/* ── Main footer grid ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* References panel */}
          <section className="panel space-y-4">
            <div>
              <p className="page-section-kicker">{t("footer.referencesKicker")}</p>
              <h3 className="panel-title mt-1">{t("footer.referencesTitle")}</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">{t("footer.referencesSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "World Bank Data", href: LINKS.worldBank },
                { label: "World Bank Catalog", href: LINKS.worldBankOpen },
                { label: "IMF Data", href: LINKS.imf },
                { label: "UN Data", href: LINKS.unData },
                { label: "OECD Stats", href: LINKS.oecd },
                { label: "GitHub", href: LINKS.github },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  className="tab"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {label}
                </a>
              ))}
            </div>
          </section>

          {/* Agreement panel */}
          <AgreementPanel />
        </div>

        {/* ── Copyright bar ── */}
        <p className="text-center text-[11px] text-faint pt-2">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>

      </footer>
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </div>
  );
}
