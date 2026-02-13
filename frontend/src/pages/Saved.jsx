import React from "react";
import { useI18n } from "../context/I18nContext";

export default function SavedPage() {
  const { t } = useI18n();
  return (
    <section className="panel-wide">
      <h3 className="panel-title">{t("savedPage.title")}</h3>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        {t("savedPage.subtitle")}
      </p>
    </section>
  );
}
