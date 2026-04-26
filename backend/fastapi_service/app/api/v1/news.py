"""
News feed endpoint — fetches economic & geopolitical RSS feeds concurrently.
Results are cached in-memory for CACHE_TTL_SECONDS to avoid hammering sources.

Design:
- httpx.AsyncClient + asyncio.gather → all feeds fetched in parallel
- asyncio.Semaphore caps concurrent outbound connections
- asyncio.Lock prevents cache stampede on expiry
- Graceful degradation: one failed feed never blocks others
- sources_status in response shows per-source latency / error (additive, backward-compat)
"""
import asyncio
import logging
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

import httpx
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["news"])

CACHE_TTL_SECONDS = 900       # 15 minutes
FETCH_TIMEOUT_SECONDS = 8.0   # per-feed wall-clock timeout
CONNECT_TIMEOUT_SECONDS = 5.0 # TCP connect timeout
MAX_CONCURRENT_FETCHES = 4    # semaphore cap (scales with feed count)
MAX_ARTICLES_PER_FEED = 8
MAX_TOTAL_ARTICLES = 40

RSS_FEEDS = [
    {"url": "https://feeds.bbci.co.uk/news/business/rss.xml",           "source": "BBC Business"},
    {"url": "https://feeds.bbci.co.uk/news/world/rss.xml",              "source": "BBC World"},
    {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml", "source": "NYT Economy"},
    {"url": "https://feeds.skynews.com/feeds/rss/business.xml",         "source": "Sky News Business"},
]

_HTML_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class _Cache:
    articles: list = field(default_factory=list)
    expires_at: float = 0.0


_cache = _Cache()
_cache_lock = asyncio.Lock()


# ---------------------------------------------------------------------------
# Parsing (pure, synchronous — no I/O)
# ---------------------------------------------------------------------------

def _parse_feed(xml_text: str, source: str) -> list[dict]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    results = []
    for item in root.findall(".//item")[:MAX_ARTICLES_PER_FEED]:
        title = (item.findtext("title") or "").strip()
        link  = (item.findtext("link")  or "").strip()
        desc  = (item.findtext("description") or "").strip()
        pub   = (item.findtext("pubDate") or "").strip()

        desc = _HTML_TAG_RE.sub("", desc).strip()
        if len(desc) > 220:
            desc = desc[:217] + "…"

        image_url = ""
        enclosure = item.find("enclosure")
        if enclosure is not None and "image" in (enclosure.get("type") or ""):
            image_url = enclosure.get("url", "")
        if not image_url:
            for child in item:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if local == "thumbnail":
                    url = child.get("url", "")
                    if url:
                        image_url = url
                        break
                elif local == "content":
                    url = child.get("url", "")
                    medium = child.get("medium", "")
                    if url and ("image" in medium or any(
                        url.lower().endswith(e) for e in (".jpg", ".jpeg", ".png", ".webp")
                    )):
                        image_url = url
                        break

        if title and link:
            results.append({
                "title":       title,
                "description": desc,
                "link":        link,
                "published":   pub,
                "source":      source,
                "image_url":   image_url,
            })
    return results


# ---------------------------------------------------------------------------
# Async fetch helpers
# ---------------------------------------------------------------------------

async def _fetch_feed(
    client: httpx.AsyncClient,
    feed: dict,
    semaphore: asyncio.Semaphore,
) -> tuple[list[dict], dict]:
    """Fetch and parse one RSS feed. Never raises — returns empty list on any error."""
    source = feed["source"]
    t0 = time.monotonic()

    async with semaphore:
        try:
            resp = await client.get(
                feed["url"],
                headers={"User-Agent": "EVision/1.0 RSS Reader"},
            )
            resp.raise_for_status()
            articles = _parse_feed(resp.text, source)
            latency_ms = int((time.monotonic() - t0) * 1000)
            logger.info(
                "news_feed_ok source=%s articles=%d latency_ms=%d",
                source, len(articles), latency_ms,
            )
            return articles, {"source": source, "status": "ok", "latency_ms": latency_ms}

        except httpx.TimeoutException as exc:
            latency_ms = int((time.monotonic() - t0) * 1000)
            logger.warning(
                "news_feed_timeout source=%s latency_ms=%d error=%s",
                source, latency_ms, exc,
            )
            return [], {"source": source, "status": "timeout", "latency_ms": latency_ms, "error": "timeout"}

        except Exception as exc:
            latency_ms = int((time.monotonic() - t0) * 1000)
            logger.warning(
                "news_feed_error source=%s latency_ms=%d error=%s",
                source, latency_ms, exc,
            )
            return [], {"source": source, "status": "error", "latency_ms": latency_ms, "error": str(exc)}


async def _fetch_all() -> tuple[list[dict], list[dict]]:
    """Fetch all RSS feeds concurrently. Returns (articles, sources_status)."""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_FETCHES)
    timeout = httpx.Timeout(FETCH_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        results = await asyncio.gather(
            *[_fetch_feed(client, feed, semaphore) for feed in RSS_FEEDS],
        )

    all_articles: list[dict] = []
    sources_status: list[dict] = []
    for articles, status in results:
        all_articles.extend(articles)
        sources_status.append(status)

    all_articles.sort(key=lambda a: a["published"], reverse=True)
    return all_articles[:MAX_TOTAL_ARTICLES], sources_status


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.get("/news")
async def get_news():
    """Return latest economic & geopolitical news from RSS feeds (cached 15 min).

    Response fields:
    - articles: list of news items (backward-compatible)
    - cached: bool — True when served from cache
    - sources_status: per-feed fetch result with latency_ms (only on cache miss)
    """
    now = time.time()
    # Fast path: serve from cache without acquiring the lock
    if now < _cache.expires_at and _cache.articles:
        return {"articles": _cache.articles, "cached": True}

    async with _cache_lock:
        # Re-check after acquiring lock to prevent cache stampede
        now = time.time()
        if now < _cache.expires_at and _cache.articles:
            return {"articles": _cache.articles, "cached": True}

        articles, sources_status = await _fetch_all()
        _cache.articles = articles
        _cache.expires_at = now + CACHE_TTL_SECONDS

    return {"articles": articles, "cached": False, "sources_status": sources_status}
