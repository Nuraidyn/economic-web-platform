import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  chat,
  deleteConversation,
  getMessages,
  listConversations,
  reportSummary,
  suggestNext,
} from "../api/aiMentorApi";
import ChatMessage from "../components/ai-mentor/ChatMessage";
import ContextPanel from "../components/ai-mentor/ContextPanel";
import ConversationSidebar from "../components/ai-mentor/ConversationSidebar";
import ReportModal from "../components/ai-mentor/ReportModal";
import SuggestionChips from "../components/ai-mentor/SuggestionChips";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";

export default function AIMentorPage() {
  const { t, lang } = useI18n();
  const { user } = useContext(AuthContext);
  const { openAuthModal } = useUI();
  const location = useLocation();
  /* convId passed via state from ChartInsightAgent "Open in AI Mentor" link */
  const incomingConvIdRef = useRef(location.state?.convId ?? null);

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [context, setContext] = useState(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const isAuthed = !!user;
  const hasAgreement = user?.agreement_accepted;
  const canUse = isAuthed && hasAgreement;

  const loadMessages = useCallback(async (convId) => {
    setMsgLoading(true);
    setMessages([]);
    setSuggestions([]);
    try {
      const data = await getMessages(convId);
      const mapped = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        structured: m.structured_response,
      }));
      setMessages(mapped);
    } catch {
      // silently ignore — conversation may be empty
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUse) return;
    setConvLoading(true);
    listConversations()
      .then((data) => {
        setConversations(data);
        const pending = incomingConvIdRef.current;
        if (pending) {
          incomingConvIdRef.current = null;
          const found = data.find((c) => c.id === pending);
          if (found) {
            setActiveConvId(found.id);
            loadMessages(found.id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setConvLoading(false));
  }, [canUse, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSelect = useCallback(
    (id) => {
      setActiveConvId(id);
      loadMessages(id);
    },
    [loadMessages]
  );

  const handleNew = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setSuggestions([]);
  }, []);

  const handleDelete = useCallback(async (id) => {
    await deleteConversation(id).catch(() => {});
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) handleNew();
  }, [activeConvId, handleNew]);

  const refreshConvList = useCallback(async () => {
    const data = await listConversations().catch(() => []);
    setConversations(data);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || sending) return;

      const userMsg = { role: "user", content: text, id: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);
      setSuggestions([]);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const payload = {
          message: text,
          conversation_id: activeConvId,
          context_snapshot: context,
          language: lang,
        };
        const data = await chat(payload, abortRef.current.signal);

        const assistantMsg = {
          role: "assistant",
          content: data.summary,
          structured: {
            summary: data.summary,
            insights: data.insights,
            limitations: data.limitations,
            suggested_next_steps: data.suggested_next_steps,
          },
          id: data.message_id,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (!activeConvId && data.conversation_id) {
          setActiveConvId(data.conversation_id);
          await refreshConvList();
        } else {
          await refreshConvList();
        }

        // chips are already rendered inside the message bubble via structured.suggested_next_steps
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Something went wrong. Please try again.",
              id: Date.now() + 1,
            },
          ]);
        }
      } finally {
        setSending(false);
      }
    },
    [sending, activeConvId, context, lang, refreshConvList]
  );

  const handleChipClick = useCallback(
    (suggestion) => sendMessage(suggestion),
    [sendMessage]
  );

  const handleSuggest = useCallback(async () => {
    if (!activeConvId) return;
    setSuggestLoading(true);
    try {
      const payload = {
        conversation_id: activeConvId,
        context_snapshot: context,
        language: lang,
      };
      const data = await suggestNext(payload);
      setSuggestions(data.suggestions || []);
    } catch {
      // ignore
    } finally {
      setSuggestLoading(false);
    }
  }, [activeConvId, context, lang]);

  const handleReport = useCallback(async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportMarkdown("");
    try {
      const payload = {
        conversation_id: activeConvId,
        context_snapshot: context,
        language: lang,
      };
      const data = await reportSummary(payload);
      setReportMarkdown(data.markdown);
    } catch {
      setReportMarkdown("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  }, [activeConvId, context, lang]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isAuthed) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-[var(--text-muted)] text-base">
          Sign in to access the AI Economic Mentor.
        </p>
        <button className="btn-primary px-5 py-2" onClick={openAuthModal}>
          Sign In
        </button>
      </div>
    );
  }

  if (!hasAgreement) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <p className="text-[var(--text-muted)] text-base text-center max-w-sm">
          Accept the data usage agreement to unlock AI features.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-stretch h-full p-4 md:p-6 overflow-hidden"
      style={{
        background:
          "var(--bg)",
        backgroundImage:
          "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(99,102,241,0.07) 0%, transparent 70%)",
      }}
    >
      {/* Floating chat card */}
      <div
        className="flex flex-1 min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)]"
        style={{
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10), 0 24px 56px rgba(0,0,0,0.12)",
        }}
      >
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-64 border-r border-[var(--panel-border)] flex-shrink-0 bg-[var(--panel)]">
          <ConversationSidebar
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelect}
            onNew={handleNew}
            onDelete={handleDelete}
            isLoading={convLoading}
          />
        </div>

        {/* Main chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)] flex-shrink-0 bg-[var(--panel)]">
            <div>
              <h1 className="text-xl font-semibold">AI Economic Mentor</h1>
              <p className="text-xs text-[var(--text-faint)] mt-0.5">
                Powered by RAG + LLM
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeConvId && (
                <>
                  <button
                    type="button"
                    className="tab text-sm px-4 py-1.5"
                    onClick={handleSuggest}
                    disabled={suggestLoading}
                  >
                    {suggestLoading ? "…" : "Suggest"}
                  </button>
                  <button
                    type="button"
                    className="tab text-sm px-4 py-1.5"
                    onClick={handleReport}
                  >
                    Report
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {msgLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`skeleton skeleton-text ${i % 2 === 0 ? "w-3/4" : "w-1/2"} h-10 rounded-2xl`}
                  />
                ))}
              </div>
            )}

            {!msgLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <p className="text-base text-[var(--text-muted)] max-w-xs">
                  Ask me anything about macroeconomics — GDP trends, inflation drivers, inequality, forecasting.
                </p>
                <SuggestionChips
                  suggestions={[
                    "What drives GDP growth?",
                    "Explain Gini coefficient",
                    "Compare inflation in emerging markets",
                  ]}
                  onSelect={handleChipClick}
                />
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                structured={msg.structured}
                onChipClick={handleChipClick}
              />
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="surface rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {suggestions.length > 0 && !sending && (
              <SuggestionChips suggestions={suggestions} onSelect={handleChipClick} />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--panel-border)] bg-[var(--panel)]">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 input resize-none py-2 leading-relaxed"
                placeholder="Ask about any economic indicator, country, or trend…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="btn-primary px-5 py-2 flex-shrink-0"
                onClick={() => sendMessage(input)}
                disabled={sending || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Context panel */}
        <div className="hidden lg:flex flex-col w-60 border-l border-[var(--panel-border)] flex-shrink-0 bg-[var(--panel)]">
          <ContextPanel context={context} onClear={() => setContext(null)} />
        </div>
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        markdown={reportMarkdown}
        isLoading={reportLoading}
      />
    </div>
  );
}
