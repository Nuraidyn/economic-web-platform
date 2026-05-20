import React from "react";

import SuggestionChips from "./SuggestionChips";

export default function ChatMessage({ role, content, structured, onChipClick }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-[var(--tab-active-bg)] text-sm leading-relaxed">
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>

        {insights.length > 0 && (
          <ol className="space-y-2 border-l-2 border-[var(--accent)] pl-3">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {insight}
              </li>
            ))}
          </ol>
        )}

        {limitations && (
          <p className="text-xs italic text-muted">{limitations}</p>
        )}

        {nextSteps.length > 0 && onChipClick && (
          <SuggestionChips suggestions={nextSteps} onSelect={onChipClick} />
        )}
      </div>
    </div>
  );
}
