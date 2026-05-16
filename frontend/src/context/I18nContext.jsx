import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import en_common from "../locales/en/common.json";
import en_navbar from "../locales/en/navbar.json";
import en_auth from "../locales/en/auth.json";
import en_home from "../locales/en/home.json";
import en_forecast from "../locales/en/forecast.json";
import en_inequality from "../locales/en/inequality.json";
import en_news from "../locales/en/news.json";
import en_saved from "../locales/en/saved.json";
import en_chart from "../locales/en/chart.json";

import ru_common from "../locales/ru/common.json";
import ru_navbar from "../locales/ru/navbar.json";
import ru_auth from "../locales/ru/auth.json";
import ru_home from "../locales/ru/home.json";
import ru_forecast from "../locales/ru/forecast.json";
import ru_inequality from "../locales/ru/inequality.json";
import ru_news from "../locales/ru/news.json";
import ru_saved from "../locales/ru/saved.json";
import ru_chart from "../locales/ru/chart.json";

import kz_common from "../locales/kz/common.json";
import kz_navbar from "../locales/kz/navbar.json";
import kz_auth from "../locales/kz/auth.json";
import kz_home from "../locales/kz/home.json";
import kz_forecast from "../locales/kz/forecast.json";
import kz_inequality from "../locales/kz/inequality.json";
import kz_news from "../locales/kz/news.json";
import kz_saved from "../locales/kz/saved.json";
import kz_chart from "../locales/kz/chart.json";

const I18nContext = createContext(null);
const LANGUAGE_KEY = "ewp_language";
const SUPPORTED_LANGUAGES = ["en", "ru", "kz"];

const DICTIONARY = {
  en: { ...en_common, ...en_navbar, ...en_auth, ...en_home, ...en_forecast, ...en_inequality, ...en_news, ...en_saved, ...en_chart },
  ru: { ...ru_common, ...ru_navbar, ...ru_auth, ...ru_home, ...ru_forecast, ...ru_inequality, ...ru_news, ...ru_saved, ...ru_chart },
  kz: { ...kz_common, ...kz_navbar, ...kz_auth, ...kz_home, ...kz_forecast, ...kz_inequality, ...kz_news, ...kz_saved, ...kz_chart },
};

function getInitialLanguage() {
  if (typeof window === "undefined") return "ru";
  const saved = window.localStorage.getItem(LANGUAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
  return "ru";
}

function interpolate(template, variables = {}) {
  return String(template).replace(/{{(\w+)}}/g, (_, key) => {
    return variables[key] == null ? "" : String(variables[key]);
  });
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key, variables) => {
    const current = DICTIONARY[language] || {};
    const fallback = DICTIONARY.en || {};
    const template = current[key] ?? fallback[key] ?? key;
    return interpolate(template, variables);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (lang) => {
        if (SUPPORTED_LANGUAGES.includes(lang)) {
          setLanguage(lang);
        }
      },
      supportedLanguages: SUPPORTED_LANGUAGES,
      t,
    }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
