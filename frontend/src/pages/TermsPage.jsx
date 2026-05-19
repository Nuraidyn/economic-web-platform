import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

const Section = ({ num, title, children }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold text-[var(--text)] flex items-baseline gap-2">
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color: "var(--accent)", minWidth: "1.5rem" }}
      >
        {num}.
      </span>
      {title}
    </h2>
    <div className="pl-6 space-y-2 text-sm text-muted leading-relaxed">
      {children}
    </div>
  </div>
);

const Li = ({ children }) => (
  <li className="flex gap-2">
    <span style={{ color: "var(--accent)", flexShrink: 0 }}>—</span>
    <span>{children}</span>
  </li>
);

export default function TermsPage() {
  const { t, language } = useI18n();

  const updated = "19 мая 2025";

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">

      {/* Header */}
      <div className="panel-wide space-y-3">
        <p className="page-section-kicker">{t("terms.kicker")}</p>
        <h1 className="hero-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
          {t("terms.title")}
        </h1>
        <p className="text-xs text-muted">
          {t("terms.version")} 1.0 &nbsp;·&nbsp; {t("terms.updated")}: {updated}
        </p>
        <div
          className="text-sm text-muted leading-relaxed p-4 rounded-lg"
          style={{ background: "var(--c-warning-bg)", border: "1px solid color-mix(in srgb, var(--c-warning) 30%, transparent)" }}
        >
          <strong style={{ color: "var(--c-warning)" }}>⚠ {t("terms.warningTitle")}</strong>
          <p className="mt-1">{t("terms.warningText")}</p>
        </div>
      </div>

      {/* Body */}
      <div className="panel-wide space-y-8">

        <Section num="1" title={t("terms.s1title")}>
          <p>{t("terms.s1p1")}</p>
          <ul className="space-y-1">
            <Li><strong>{t("terms.s1t_platform")}</strong> — {t("terms.s1d_platform")}</Li>
            <Li><strong>{t("terms.s1t_user")}</strong> — {t("terms.s1d_user")}</Li>
            <Li><strong>{t("terms.s1t_data")}</strong> — {t("terms.s1d_data")}</Li>
            <Li><strong>{t("terms.s1t_forecast")}</strong> — {t("terms.s1d_forecast")}</Li>
          </ul>
        </Section>

        <div className="section-divider" />

        <Section num="2" title={t("terms.s2title")}>
          <p>{t("terms.s2p1")}</p>
          <p>{t("terms.s2p2")}</p>
        </Section>

        <div className="section-divider" />

        <Section num="3" title={t("terms.s3title")}>
          <p>{t("terms.s3p1")}</p>
          <ul className="space-y-1">
            <Li>{t("terms.s3b1")}</Li>
            <Li>{t("terms.s3b2")}</Li>
            <Li>{t("terms.s3b3")}</Li>
            <Li>{t("terms.s3b4")}</Li>
          </ul>
        </Section>

        <div className="section-divider" />

        <Section num="4" title={t("terms.s4title")}>
          <p>{t("terms.s4p1")}</p>
          <p>{t("terms.s4p2")}</p>
          <ul className="space-y-1">
            <Li>{t("terms.s4b1")}</Li>
            <Li>{t("terms.s4b2")}</Li>
            <Li>{t("terms.s4b3")}</Li>
          </ul>
        </Section>

        <div className="section-divider" />

        <Section num="5" title={t("terms.s5title")}>
          <p>{t("terms.s5p1")}</p>
          <p>{t("terms.s5p2")}</p>
          <ul className="space-y-1">
            <Li>{t("terms.s5b1")}</Li>
            <Li>{t("terms.s5b2")}</Li>
            <Li>{t("terms.s5b3")}</Li>
          </ul>
        </Section>

        <div className="section-divider" />

        <Section num="6" title={t("terms.s6title")}>
          <p>{t("terms.s6p1")}</p>
          <ul className="space-y-1">
            <Li>{t("terms.s6b1")}</Li>
            <Li>{t("terms.s6b2")}</Li>
            <Li>{t("terms.s6b3")}</Li>
            <Li>{t("terms.s6b4")}</Li>
          </ul>
        </Section>

        <div className="section-divider" />

        <Section num="7" title={t("terms.s7title")}>
          <p>{t("terms.s7p1")}</p>
          <p>{t("terms.s7p2")}</p>
        </Section>

        <div className="section-divider" />

        <Section num="8" title={t("terms.s8title")}>
          <p>{t("terms.s8p1")}</p>
          <p>{t("terms.s8p2")}</p>
        </Section>

        <div className="section-divider" />

        <Section num="9" title={t("terms.s9title")}>
          <p>{t("terms.s9p1")}</p>
          <p>
            {t("terms.s9contact")}:{" "}
            <a
              href="mailto:nuraidynseitkapar@gmail.com"
              className="underline"
              style={{ color: "var(--accent)" }}
            >
              nuraidynseitkapar@gmail.com
            </a>
          </p>
        </Section>

      </div>

      {/* Back */}
      <div className="flex justify-center pb-4">
        <Link to="/" className="btn-secondary">
          ← {t("terms.backHome")}
        </Link>
      </div>

    </div>
  );
}
