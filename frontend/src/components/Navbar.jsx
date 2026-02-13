import React from "react";
import { Link, NavLink } from "react-router-dom";

import logoEconomicSignals from "../assets/logo-economic-signals.svg";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ onOpenAuth, isAuthenticated }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, supportedLanguages, t } = useI18n();
  const targetMode = theme === "dark" ? t("navbar.lightMode") : t("navbar.darkMode");

  return (
    <header className="border-b border-slate-900/10 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
      <nav className="max-w-[1480px] mx-auto px-6 py-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              to="/"
              className="shrink-0 mt-0.5"
              aria-label={t("navbar.title")}
              title={t("navbar.title")}
            >
              <img
                src={logoEconomicSignals}
                alt="Economic Signals Studio logo"
                className="w-12 h-12 rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
              />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-600/80 dark:text-slate-400/80">
                {t("navbar.kicker")}
              </p>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
                <Link to="/" className="hover:text-slate-950 dark:hover:text-white transition">
                  {t("navbar.title")}
                </Link>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1">
              {supportedLanguages.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={language === code ? "tab-active" : "tab"}
                  onClick={() => setLanguage(code)}
                >
                  {t(`language.${code}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={toggleTheme}
              aria-label={t("navbar.switchTo", { mode: targetMode })}
              title={t("navbar.switchTo", { mode: targetMode })}
            >
              {theme === "dark" ? t("navbar.themeLight") : t("navbar.themeDark")}
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={onOpenAuth}
              aria-label={isAuthenticated ? t("navbar.openAccount") : t("navbar.openSignIn")}
              title={isAuthenticated ? t("navbar.openAccount") : t("navbar.openSignIn")}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.8-3.4 4.6-5 8-5s6.2 1.6 8 5" />
              </svg>
              <span>{isAuthenticated ? t("navbar.account") : t("navbar.signIn")}</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink to="/" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
            {t("layout.dashboard")}
          </NavLink>
          <NavLink to="/inequality" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
            {t("layout.inequality")}
          </NavLink>
          <NavLink to="/forecast" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
            {t("layout.forecast")}
          </NavLink>
          <NavLink to="/saved" className={({ isActive }) => (isActive ? "tab-active" : "tab")}>
            {t("layout.saved")}
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
