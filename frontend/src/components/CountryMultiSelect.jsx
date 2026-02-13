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

  return (
    <div className="space-y-2">
      <label className="label">{t("selector.countries")}</label>
      <input
        className="input"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("selector.searchCountry")}
      />
      <div className="surface p-2 max-h-52 overflow-y-auto space-y-1">
        {filteredCountries.map((country) => {
          const checked = selected.includes(country.code);
          return (
            <label
              key={country.code}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-900/5 dark:hover:bg-slate-100/5"
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
