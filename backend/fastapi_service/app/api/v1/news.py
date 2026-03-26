"""
News feed endpoint — fetches economic & geopolitical RSS feeds.
Results are cached in-memory for CACHE_TTL_SECONDS to avoid hammering sources.
"""
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional

import httpx
from fastapi import APIRouter

router = APIRouter(tags=["news"])

CACHE_TTL_SECONDS = 900  # 15 minutes

RSS_FEEDS = [
    {"url": "https://feeds.bbci.co.uk/news/business/rss.xml",      "source": "BBC Business"},
    {"url": "https://feeds.bbci.co.uk/news/world/rss.xml",         "source": "BBC World"},
    {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml", "source": "NYT Economy"},
    {"url": "https://feeds.skynews.com/feeds/rss/business.xml",    "source": "Sky News Business"},
]

@dataclass
class _Cache:
    articles: list = field(default_factory=list)
    expires_at: float = 0.0

_cache = _Cache()


def _parse_feed(xml_text: str, source: str) -> list[dict]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    ns = {}
    items = root.findall(".//item")
    results = []
    for item in items[:8]:
        title = (item.findtext("title") or "").strip()
        link  = (item.findtext("link")  or "").strip()
        desc  = (item.findtext("description") or "").strip()
        pub   = (item.findtext("pubDate") or "").strip()

        # Strip HTML tags from description
        import re
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        if len(desc) > 220:
            desc = desc[:217] + "…"

        # Extract image URL: try enclosure first, then media:thumbnail / media:content
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


def _fetch_all() -> list[dict]:
    articles = []
    with httpx.Client(timeout=8, follow_redirects=True) as client:
        for feed in RSS_FEEDS:
            try:
                resp = client.get(feed["url"], headers={"User-Agent": "EVision/1.0 RSS Reader"})
                resp.raise_for_status()
                articles.extend(_parse_feed(resp.text, feed["source"]))
            except Exception:
                continue
    # Sort by published date descending (best-effort string sort is fine for RFC-822)
    articles.sort(key=lambda a: a["published"], reverse=True)
    return articles[:40]


@router.get("/news")
def get_news():
    """Return latest economic & geopolitical news from RSS feeds (cached 15 min)."""
    now = time.time()
    if now < _cache.expires_at and _cache.articles:
        return {"articles": _cache.articles, "cached": True}

    articles = _fetch_all()
    _cache.articles = articles
    _cache.expires_at = now + CACHE_TTL_SECONDS
    return {"articles": articles, "cached": False}
