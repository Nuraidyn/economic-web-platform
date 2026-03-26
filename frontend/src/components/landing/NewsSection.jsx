import React, { useCallback, useEffect, useState } from "react";

import { fetchNews } from "../../api/newsApi";
import { useReveal } from "../../hooks/useReveal";
import { useI18n } from "../../context/I18nContext";

const INITIAL_COUNT = 6;
const STEP_COUNT = 6;

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

function formatDate(pubDate) {
  if (!pubDate) return "";
  try {
    const d = new Date(pubDate);
    if (isNaN(d)) return pubDate.slice(0, 16);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function NewsCard({ article, index }) {
  const [ref, visible] = useReveal(0.05);
  const delayClass = index < 5 ? `reveal-delay-${index + 1}` : "";

  return (
    <a
      ref={ref}
      href={article.link}
      target="_blank"
      rel="noreferrer noopener"
      className={`news-card reveal ${visible ? "is-visible" : ""} ${delayClass}`}
    >
      {/* Thumbnail — shown when available, hidden on image load error */}
      {article.image_url && (
        <div className="news-card-image">
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      <div className="news-card-source">{article.source}</div>
      <h4 className="news-card-title">{article.title}</h4>
      {article.description && (
        <p className="news-card-desc">{article.description}</p>
      )}
      <div className="news-card-footer">
        <span className="news-card-date">{article.published ? formatDate(article.published) : ""}</span>
        <span className="news-card-link"><ExternalLinkIcon /></span>
      </div>
    </a>
  );
}

export default function NewsSection() {
  const { t } = useI18n();
  const [headerRef, headerVisible] = useReveal(0.05);
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: false });
  const [shown, setShown] = useState(INITIAL_COUNT);

  const load = useCallback(async () => {
    setStatus({ loading: true, error: false });
    setShown(INITIAL_COUNT);
    try {
      const data = await fetchNews();
      setArticles(data.articles || []);
      setStatus({ loading: false, error: false });
    } catch {
      setStatus({ loading: false, error: true });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleArticles = articles.slice(0, shown);
  const hasMore = articles.length > shown;

  return (
    <section>
      {/* Header */}
      <div
        ref={headerRef}
        className={`reveal ${headerVisible ? "is-visible" : ""} mb-6 flex items-end justify-between gap-4 flex-wrap`}
      >
        <div>
          <span className="page-section-kicker">{t("news.kicker")}</span>
          <h2 className="panel-title mt-1" style={{ fontSize: "1.6rem" }}>
            {t("news.title")}
          </h2>
          <p className="text-xs text-muted mt-1">{t("news.subtitle")}</p>
        </div>
        <button
          type="button"
          className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 shrink-0"
          onClick={load}
          disabled={status.loading}
          aria-label={t("news.refresh")}
        >
          <RefreshIcon />
          <span>{t("news.refresh")}</span>
        </button>
      </div>

      {/* Loading skeletons */}
      {status.loading && (
        <div className="news-grid">
          {Array.from({ length: INITIAL_COUNT }).map((_, i) => (
            <div key={i} className="news-card-skeleton">
              <div className="skeleton news-card-image-skeleton mb-3" />
              <div className="skeleton skeleton-text w-20 mb-2" />
              <div className="skeleton skeleton-text w-full mb-1" />
              <div className="skeleton skeleton-text w-4/5 mb-3" />
              <div className="skeleton skeleton-text w-2/5" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {status.error && !status.loading && (
        <p className="text-sm text-muted text-center py-8">{t("news.error")}</p>
      )}

      {/* Cards */}
      {!status.loading && !status.error && (
        <>
          <div className="news-grid">
            {visibleArticles.map((article, i) => (
              <NewsCard key={article.link} article={article} index={i} />
            ))}
          </div>

          {/* Pagination controls */}
          {(hasMore || shown > INITIAL_COUNT) && (
            <div className="flex justify-center gap-3 mt-8">
              {hasMore && (
                <button
                  type="button"
                  className="btn-secondary px-6 py-2"
                  onClick={() => setShown((s) => s + STEP_COUNT)}
                >
                  {t("news.showMore")}
                </button>
              )}
              {shown > INITIAL_COUNT && (
                <button
                  type="button"
                  className="btn-secondary px-6 py-2"
                  onClick={() => setShown(INITIAL_COUNT)}
                >
                  {t("news.showLess")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
