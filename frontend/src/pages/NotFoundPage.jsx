import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      {/* Big 404 number */}
      <p
        className="select-none leading-none mb-4"
        style={{
          fontSize: "clamp(6rem, 20vw, 12rem)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          background: "var(--gradient-accent)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          opacity: 0.18,
        }}
        aria-hidden="true"
      >
        404
      </p>

      {/* Icon */}
      <div className="empty-state-icon mb-4" style={{ width: "3.5rem", height: "3.5rem" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="11" />
          <line x1="11" y1="14" x2="11.01" y2="14" />
        </svg>
      </div>

      <h1 className="panel-title text-2xl mb-2">{t("notFound.title")}</h1>
      <p className="text-sm text-muted max-w-sm mb-8">{t("notFound.subtitle")}</p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/" className="btn-primary">
          {t("notFound.goHome")}
        </Link>
        <Link to="/compare" className="btn-secondary">
          {t("notFound.goCompare")}
        </Link>
      </div>
    </div>
  );
}
