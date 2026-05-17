import React from "react";

export default function ContextPanel({ context, onClear }) {
  const hasContext =
    context &&
    ((context.countries && context.countries.length > 0) ||
      (context.indicators && context.indicators.length > 0));

  return (
    <aside className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-faint)]">
          Chart Context
        </h3>
        {hasContext && (
          <button
            type="button"
            className="text-[10px] text-[var(--text-faint)] hover:text-rose-400 transition-colors"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>

      {!hasContext ? (
        <p className="text-xs text-[var(--text-faint)] leading-relaxed">
          No chart context loaded. Visit{" "}
          <span className="text-[var(--accent)]">Compare</span> to attach data.
        </p>
      ) : (
        <div className="space-y-4">
          {context.countries && context.countries.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">
                Countries
              </p>
              <div className="flex flex-wrap gap-1">
                {context.countries.map((c) => (
                  <span
                    key={c}
                    className="tab text-[10px] px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {context.indicators && context.indicators.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">
                Indicators
              </p>
              <div className="flex flex-wrap gap-1">
                {context.indicators.map((ind) => (
                  <span
                    key={ind}
                    className="tab text-[10px] px-2 py-0.5"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {context.year_range && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-1">
                Year Range
              </p>
              <p className="text-xs font-medium">
                {context.year_range[0]} – {context.year_range[1]}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
