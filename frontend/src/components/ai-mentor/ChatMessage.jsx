import React from "react";

import SuggestionChips from "./SuggestionChips";

export default function ChatMessage({ role, content, structured, onChipClick }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-[var(--tab-active-bg)] text-base">
          {content}
        </div>
      </div>
    );
  }

  const summary = structured?.summary || content;
  const insights = structured?.insights || [];
  const limitations = structured?.limitations || "";
  const nextSteps = structured?.suggested_next_steps || [];

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] surface rounded-2xl rounded-tl-sm px-4 py-4 space-y-3">
        <p className="text-base font-medium leading-relaxed">{summary}</p>

        {insights.length > 0 && (
          <ol className="space-y-1.5 border-l-2 border-[var(--accent)] pl-3">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-[var(--text-muted)]">
                {insight}
              </li>
            ))}
          </ol>
        )}

        {limitations && (
          <p className="text-sm italic text-[var(--text-faint)]">{limitations}</p>
        )}

        {nextSteps.length > 0 && onChipClick && (
          <SuggestionChips suggestions={nextSteps} onSelect={onChipClick} />
        )}
      </div>
    </div>
  );
}
