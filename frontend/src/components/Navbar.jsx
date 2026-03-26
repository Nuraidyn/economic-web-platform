import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { EVisionLogoFull } from "./EVisionLogo";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

/* ── Icon helpers ── */
const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="2 4 6 8 10 4" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10A15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.8-3.4 4.6-5 8-5s6.2 1.6 8 5" />
  </svg>
);

/* ── Social icons ── */
const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TelegramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

/* ── Products ── */
const PRODUCTS = [
  {
    labelKey: "navbar.productAnalysis",
    descKey:  "navbar.productAnalysisDesc",
    to: "/analysis",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" /><polyline points="7 16 11 11 14 14 18 9" />
      </svg>
    ),
  },
  {
    labelKey: "navbar.productForecast",
    descKey:  "navbar.productForecastDesc",
    to: "/forecast",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    labelKey:  "navbar.productNews",
    descKey:   "navbar.productNewsDesc",
    to:        "/",
    sectionId: "news",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2V9" />
        <line x1="10" y1="7" x2="17" y2="7" />
        <line x1="10" y1="11" x2="17" y2="11" />
        <line x1="10" y1="15" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    labelKey: "navbar.productSaved",
    descKey:  "navbar.productSavedDesc",
    to: "/saved",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const COMMUNITY = [
  { label: "GitHub",      icon: <GithubIcon />,   href: "#" },
  { label: "Twitter / X", icon: <TwitterIcon />,  href: "#" },
  { label: "LinkedIn",    icon: <LinkedinIcon />,  href: "#" },
  { label: "Telegram",    icon: <TelegramIcon />,  href: "#" },
];

/* Language list — always shown in native script */
const LANGUAGES = [
  { code: "en", flag: "🇬🇧", nativeName: "English"  },
  { code: "ru", flag: "🇷🇺", nativeName: "Русский"  },
  { code: "kz", flag: "🇰🇿", nativeName: "Қазақша"  },
  { code: "de", flag: "🇩🇪", nativeName: "Deutsch"  },
  { code: "fr", flag: "🇫🇷", nativeName: "Français" },
  { code: "zh", flag: "🇨🇳", nativeName: "中文"     },
  { code: "es", flag: "🇪🇸", nativeName: "Español"  },
];

export default function Navbar({ onOpenAuth, isAuthenticated }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const handleProductClick = (to, sectionId) => {
    if (!sectionId) return;
    if (location.pathname === to) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(to);
      // After navigation the DOM re-renders; give it a frame to mount
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 dark:border-white/10 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md">
      <nav className="max-w-[1480px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">

        {/* ── Brand ── */}
        <Link
          to="/"
          aria-label={t("navbar.title")}
          className="shrink-0"
        >
          <EVisionLogoFull markSize={30} wordmarkSize="sm" showKicker={false} animate />
        </Link>

        {/* ── Center: Products + Community (desktop) ── */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 pl-3">

          {/* Products */}
          <div className="nav-dropdown">
            <button type="button" className="nav-dropdown-trigger" aria-haspopup="menu">
              {t("navbar.products")} <ChevronDown />
            </button>
            <div className="nav-dropdown-panel nav-products-panel" role="menu">
              {PRODUCTS.map(({ labelKey, descKey, to, icon, sectionId }) =>
                sectionId ? (
                  <button
                    key={labelKey}
                    type="button"
                    role="menuitem"
                    className="nav-product-item"
                    onClick={() => handleProductClick(to, sectionId)}
                  >
                    <span className="nav-product-icon">{icon}</span>
                    <span>
                      <span className="nav-product-title">{t(labelKey)}</span>
                      <span className="nav-product-desc">{t(descKey)}</span>
                    </span>
                  </button>
                ) : (
                  <NavLink key={labelKey} to={to} role="menuitem" className="nav-product-item">
                    <span className="nav-product-icon">{icon}</span>
                    <span>
                      <span className="nav-product-title">{t(labelKey)}</span>
                      <span className="nav-product-desc">{t(descKey)}</span>
                    </span>
                  </NavLink>
                )
              )}
            </div>
          </div>

          {/* Community */}
          <div className="nav-dropdown">
            <button type="button" className="nav-dropdown-trigger" aria-haspopup="menu">
              {t("navbar.community")} <ChevronDown />
            </button>
            <div className="nav-dropdown-panel" role="menu" style={{ minWidth: "12rem" }}>
              {COMMUNITY.map(({ label, icon, href }) => (
                <a key={label} href={href} role="menuitem"
                  target="_blank" rel="noreferrer noopener"
                  className="nav-community-item">
                  <span className="nav-community-icon">{icon}</span>
                  <span className="nav-product-title">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right controls ── */}
        <div className="flex items-center gap-1.5 ml-auto">

          {/* Language globe */}
          <div className="nav-dropdown nav-dropdown-right">
            <button type="button" className="nav-icon-btn" aria-label="Select language">
              <GlobeIcon />
            </button>
            <div className="nav-dropdown-panel nav-lang-panel" role="menu">
              {LANGUAGES.map(({ code, flag, nativeName }) => (
                <button
                  key={code}
                  type="button"
                  role="menuitem"
                  className={["nav-lang-item", language === code ? "nav-lang-item-active" : ""].join(" ")}
                  onClick={() => setLanguage(code)}
                >
                  <span className="nav-lang-flag" aria-hidden="true">{flag}</span>
                  <span>{nativeName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            className="nav-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("navbar.themeLight") : t("navbar.themeDark")}
            title={theme === "dark" ? t("navbar.themeLight") : t("navbar.themeDark")}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Sign In / Account */}
          <button
            type="button"
            className="nav-signin-btn"
            onClick={onOpenAuth}
            aria-label={isAuthenticated ? t("navbar.openAccount") : t("navbar.openSignIn")}
          >
            <UserIcon />
            <span className="hidden sm:inline">{isAuthenticated ? t("navbar.account") : t("navbar.signIn")}</span>
          </button>
        </div>

      </nav>
    </header>
  );
}
