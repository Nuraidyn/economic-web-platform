# I18n Refactor: Extract translations to namespaced JSON files

**Date:** 2026-05-16  
**Status:** Approved

## Problem

`frontend/src/context/I18nContext.jsx` is 1597 lines. ~1540 of those lines are a hardcoded `DICTIONARY` object containing translations for 7 languages. This makes the file slow to navigate, prone to merge conflicts during active development, and hard to hand off to translators.

## Goal

Move all translation strings out of `I18nContext.jsx` into namespaced JSON files. The context provider logic stays intact. No changes to how components use translations (`t("home.heroTitle")` etc. remains unchanged).

## File Structure

```
frontend/src/locales/
  en/
    common.json       ← keys: common.*, language.*, layout.*, footer.*
    navbar.json       ← keys: navbar.*
    auth.json         ← keys: auth.*, forgot.*, resetPwd.*, verifyPage.*, agreement.*
    home.json         ← keys: home.*, compare.*, comparison.*, selector.*, map.*, landing.*
    forecast.json     ← keys: forecast.*, forecastPage.*
    inequality.json   ← keys: gini.*, inequalityPage.*, incomeAnalysis.*
    news.json         ← keys: news.*
    saved.json        ← keys: savedPage.*, preset.*, workspace.*
    chart.json        ← keys: chart.*, ai.*
  ru/   (same 9 files)
  kz/   (same 9 files)
```

Total: 3 languages × 9 namespaces = 27 JSON files.

The partial translations (de, fr, zh, es) remain inside `I18nContext.jsx` as a small inline object until they are fully translated.

## I18nContext.jsx After Refactor

The provider shrinks to ~60 lines. It imports all JSON files and merges them per language:

```js
import en_common from "../locales/en/common.json";
import en_navbar from "../locales/en/navbar.json";
// ... (all 63 imports)

const DICTIONARY = {
  en: { ...en_common, ...en_navbar, ...en_auth, ...en_home,
        ...en_forecast, ...en_inequality, ...en_news, ...en_saved, ...en_chart },
  ru: { ...ru_common, ...ru_navbar, ... },
  kz: { ...kz_common, ...kz_navbar, ... },
  // de, fr, zh, es stay inline (partial translations, ~40 keys each)
};
```

All other logic in `I18nContext.jsx` (provider, `useI18n` hook, language switching, localStorage) stays untouched.

## Key Invariants

- **Zero changes to component code.** Translation keys (`t("home.heroTitle")`) are unchanged.
- **Key names stay flat inside JSON.** Each JSON file contains flat `{ "home.heroTitle": "..." }` entries, not nested objects.
- **Fallback to English** for partial translations (de/fr/zh/es) is already handled by existing context logic — no changes needed.
- **SUPPORTED_LANGUAGES** array and localStorage key remain unchanged.

## Testing

After refactor, manually verify:
1. Language switching works for all 7 languages
2. All pages render without missing translation keys (check browser console for `[i18n]` warnings if any exist)
3. `npm run lint` passes
4. `npm test` passes

## Out of Scope

- No lazy-loading of locale files (all imported statically — acceptable given bundle size)
- No migration to i18next or other i18n library
- No changes to translation keys or values
