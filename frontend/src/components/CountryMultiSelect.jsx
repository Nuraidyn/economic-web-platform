import React, { useMemo, useState } from "react";
import { useI18n } from "../context/I18nContext";

export default function CountryMultiSelect({
  countries,
  onSelect,
  selected,
  maxSelection = 4,
  onLimitReached,
}) {
  const [query, setQuery] = useState("");
  const { t } = useI18n();

  const filteredCountries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return countries;
    }
    return countries.filter((country) => {
      const code = String(country.code || "").toLowerCase();
      const name = String(country.name || "").toLowerCase();
      return code.includes(normalized) || name.includes(normalized);
    });
  }, [countries, query]);

  const toggleCountry = (code) => {
    if (selected.includes(code)) {
      onSelect(selected.filter((item) => item !== code));
      return;
    }
    if (selected.length >= maxSelection) {
      onLimitReached?.(t("selector.tooManyCountries", { max: maxSelection }));
      return;
    }
    onSelect([...selected, code]);
  };

  const selectedCountries = countries.filter((c) => selected.includes(c.code));

  return (
    <div className="space-y-2">
      <label className="label">{t("selector.countries")}</label>
      <div className="input flex flex-wrap gap-1.5 min-h-[2.5rem] items-center p-1.5">
        {selectedCountries.map((country) => (
          <span
            key={country.code}
            className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 font-medium"
          >
            {country.name}
            <button
              type="button"
              onClick={() => toggleCountry(country.code)}
              className="ml-0.5 hover:text-blue-800 dark:hover:text-blue-200 leading-none"
              aria-label={`Remove ${country.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm placeholder:text-muted"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedCountries.length === 0 ? t("selector.searchCountry") : ""}
        />
      </div>
      <div className="surface p-2 max-h-52 overflow-y-auto space-y-1">
        {filteredCountries.map((country) => {
          const checked = selected.includes(country.code);
          return (
            <label
              key={country.code}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer transition-colors duration-150 hover:bg-slate-900/5 dark:hover:bg-slate-100/5"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCountry(country.code)}
              />
              <span className="text-sm">
                {country.name}
                <span className="text-faint text-xs ml-2">{country.code}</span>
              </span>
            </label>
          );
        })}
        {!filteredCountries.length && (
          <p className="text-xs text-muted px-2 py-3">{t("selector.noCountries")}</p>
        )}
      </div>
      <p className="text-[11px] text-muted">
        {t("selector.countriesSelected", { selected: selected.length, max: maxSelection })}
      </p>
    </div>
  );
}
