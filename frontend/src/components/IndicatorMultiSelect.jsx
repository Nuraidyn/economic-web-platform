import React, { useMemo, useState } from "react";
import { useI18n } from "../context/I18nContext";

export default function IndicatorMultiSelect({
  indicators,
  onChange,
  selected,
  maxSelection = 4,
  onLimitReached,
}) {
  const [query, setQuery] = useState("");
  const { t } = useI18n();

  const filteredIndicators = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return indicators;
    }
    return indicators.filter((indicator) => {
      const code = String(indicator.code || "").toLowerCase();
      const label = String(indicator.label || indicator.name || "").toLowerCase();
      return code.includes(normalized) || label.includes(normalized);
    });
  }, [indicators, query]);

  const toggleIndicator = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((item) => item !== code));
      return;
    }
    if (selected.length >= maxSelection) {
      onLimitReached?.(t("selector.tooManyIndicators", { max: maxSelection }));
      return;
    }
    onChange([...selected, code]);
  };

  return (
    <div className="space-y-2">
      <label className="label">{t("selector.indicators")}</label>
      <input
        className="input"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("selector.searchIndicator")}
      />
      <div className="surface p-2 max-h-52 overflow-y-auto space-y-1">
        {filteredIndicators.map((indicator) => {
          const checked = selected.includes(indicator.code);
          return (
            <label
              key={indicator.code}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-900/5 dark:hover:bg-slate-100/5"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleIndicator(indicator.code)}
              />
              <span className="text-sm">
                {indicator.label || indicator.name}
                <span className="text-faint text-xs ml-2">{indicator.code}</span>
              </span>
            </label>
          );
        })}
        {!filteredIndicators.length && (
          <p className="text-xs text-muted px-2 py-3">{t("selector.noIndicators")}</p>
        )}
      </div>
      <p className="text-[11px] text-muted">
        {t("selector.indicatorsSelected", { selected: selected.length, max: maxSelection })}
      </p>
    </div>
  );
}
