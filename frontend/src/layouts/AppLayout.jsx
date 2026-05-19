import React, { useContext, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import AgreementPanel from "../components/AgreementPanel";
import AuthModal from "../components/AuthModal";
import CookieConsentBanner from "../components/CookieConsentBanner";
import ErrorBoundary from "../components/ErrorBoundary";
import Navbar from "../components/Navbar";
import SessionExpiredToast from "../components/SessionExpiredToast";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";
import { LINKS } from "../constants";

const NO_FOOTER_PATHS = ["/ai-mentor"];

export default function AppLayout() {
  const { user, authStatus } = useContext(AuthContext);
  const { t } = useI18n();
  const { authModalOpen, openAuthModal, closeAuthModal } = useUI();
  const location = useLocation();

  const hideFooter = NO_FOOTER_PATHS.includes(location.pathname);

  useEffect(() => {
    if (authStatus.expired && !authModalOpen) {
      openAuthModal();
    }
  }, [authStatus.expired, authModalOpen, openAuthModal]);

  return (
    <div className={hideFooter ? "h-screen flex flex-col overflow-hidden bg-canvas" : "min-h-screen bg-canvas overflow-x-hidden"}>
      <Navbar onOpenAuth={openAuthModal} isAuthenticated={Boolean(user)} />

      {hideFooter ? (
        <main className="flex-1 min-h-0 overflow-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      ) : (
        <>
          <main className="page !max-w-[1480px]">
            <div className="space-y-6 min-w-0">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>

          <footer className="max-w-[1480px] mx-auto w-full px-4 md:px-6 pb-12 space-y-4">
            <div className="section-divider" aria-hidden="true" />

            <div className="grid md:grid-cols-2 gap-4">
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
                    <a key={label} className="tab" href={href} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              </section>

              <AgreementPanel />
            </div>

            <p className="text-center text-[11px] text-faint pt-2 flex items-center justify-center gap-2 flex-wrap">
              <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
              <span aria-hidden="true">·</span>
              <Link to="/privacy" className="hover:text-[var(--text)] transition-colors underline-offset-2 hover:underline">
                {t("footer.privacy")}
              </Link>
            </p>
          </footer>
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
      <CookieConsentBanner />
      <SessionExpiredToast />
    </div>
  );
}
