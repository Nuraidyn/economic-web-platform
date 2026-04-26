"""Tests for the async news endpoint (fix/news-endpoint-async).

Coverage:
  - _parse_feed: unit tests (pure function, no I/O)
  - _fetch_all:  async tests via IsolatedAsyncioTestCase
      * all sources ok
      * one source timeout → partial result, no exception
      * all sources down → empty articles, 200 OK
  - GET /news:   integration via TestClient
      * cache miss triggers fetch
      * cache hit short-circuits fetch
      * partial source failure still returns 200
"""
import asyncio
import time
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Minimal valid RSS fixture
# ---------------------------------------------------------------------------

_RSS_ONE_ITEM = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>GDP rises 2%</title>
      <link>https://example.com/news/1</link>
      <description>Economy grows &lt;b&gt;strongly&lt;/b&gt; this quarter.</description>
      <pubDate>Mon, 25 Apr 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>"""

_RSS_WITH_IMAGE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <item>
      <title>Trade deal signed</title>
      <link>https://example.com/news/2</link>
      <description>Nations agree.</description>
      <pubDate>Mon, 25 Apr 2026 09:00:00 GMT</pubDate>
      <media:thumbnail url="https://example.com/img.jpg"/>
    </item>
  </channel>
</rss>"""

_RSS_EMPTY = """<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>"""


def _make_response(text: str) -> MagicMock:
    mock = MagicMock()
    mock.text = text
    mock.raise_for_status = MagicMock()
    return mock


# ---------------------------------------------------------------------------
# 1. Unit tests: _parse_feed (pure, sync)
# ---------------------------------------------------------------------------

class TestParseFeed(unittest.TestCase):

    def _parse(self, xml, source="Test"):
        from app.api.v1.news import _parse_feed
        return _parse_feed(xml, source)

    def test_parses_title_link_source(self):
        articles = self._parse(_RSS_ONE_ITEM, "BBC Business")
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0]["title"], "GDP rises 2%")
        self.assertEqual(articles[0]["link"], "https://example.com/news/1")
        self.assertEqual(articles[0]["source"], "BBC Business")

    def test_strips_html_from_description(self):
        articles = self._parse(_RSS_ONE_ITEM)
        self.assertNotIn("<b>", articles[0]["description"])
        self.assertNotIn("</b>", articles[0]["description"])
        self.assertIn("strongly", articles[0]["description"])

    def test_description_truncated_at_220(self):
        long_desc = "x" * 300
        rss = (
            "<rss><channel><item>"
            "<title>T</title><link>http://x.com</link>"
            f"<description>{long_desc}</description>"
            "<pubDate>Mon, 25 Apr 2026 10:00:00 GMT</pubDate>"
            "</item></channel></rss>"
        )
        articles = self._parse(rss)
        self.assertLessEqual(len(articles[0]["description"]), 220)
        self.assertTrue(articles[0]["description"].endswith("…"))

    def test_extracts_media_thumbnail(self):
        articles = self._parse(_RSS_WITH_IMAGE)
        self.assertEqual(articles[0]["image_url"], "https://example.com/img.jpg")

    def test_empty_feed_returns_empty_list(self):
        self.assertEqual(self._parse(_RSS_EMPTY), [])

    def test_malformed_xml_returns_empty_list(self):
        self.assertEqual(self._parse("not xml at all <<>>"), [])

    def test_item_without_title_skipped(self):
        rss = (
            "<rss><channel><item>"
            "<link>http://x.com</link>"
            "<pubDate>Mon, 25 Apr 2026 10:00:00 GMT</pubDate>"
            "</item></channel></rss>"
        )
        self.assertEqual(self._parse(rss), [])

    def test_caps_at_max_articles_per_feed(self):
        from app.api.v1.news import MAX_ARTICLES_PER_FEED
        items = "".join(
            f"<item><title>Item {i}</title><link>http://x.com/{i}</link>"
            f"<pubDate>Mon, 25 Apr 2026 10:00:00 GMT</pubDate></item>"
            for i in range(MAX_ARTICLES_PER_FEED + 5)
        )
        rss = f"<rss><channel>{items}</channel></rss>"
        articles = self._parse(rss)
        self.assertLessEqual(len(articles), MAX_ARTICLES_PER_FEED)


# ---------------------------------------------------------------------------
# 2. Async tests: _fetch_all
# ---------------------------------------------------------------------------

class TestFetchAllAsync(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        # Reset cache before each async test
        from app.api.v1 import news as news_mod
        news_mod._cache.articles = []
        news_mod._cache.expires_at = 0.0

    async def test_all_sources_ok_returns_articles(self):
        from app.api.v1 import news as news_mod

        async def mock_get(url, **kwargs):
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            articles, statuses = await news_mod._fetch_all()

        self.assertEqual(len(statuses), len(news_mod.RSS_FEEDS))
        self.assertTrue(all(s["status"] == "ok" for s in statuses))
        self.assertGreater(len(articles), 0)
        # All status entries have latency_ms
        for s in statuses:
            self.assertIn("latency_ms", s)

    async def test_one_source_timeout_partial_result(self):
        """One feed times out — other feeds' articles still returned."""
        from app.api.v1 import news as news_mod

        feeds_called = []

        async def mock_get(url, **kwargs):
            feeds_called.append(url)
            if url == news_mod.RSS_FEEDS[0]["url"]:
                raise httpx.TimeoutException("timed out", request=MagicMock())
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            articles, statuses = await news_mod._fetch_all()

        timeout_statuses = [s for s in statuses if s["status"] == "timeout"]
        ok_statuses = [s for s in statuses if s["status"] == "ok"]
        self.assertEqual(len(timeout_statuses), 1)
        self.assertEqual(len(ok_statuses), len(news_mod.RSS_FEEDS) - 1)
        # Partial result: articles from working sources
        self.assertGreater(len(articles), 0)
        # All feeds were attempted
        self.assertEqual(len(feeds_called), len(news_mod.RSS_FEEDS))

    async def test_all_sources_fail_returns_empty_no_exception(self):
        """All feeds fail — no exception raised, empty articles list."""
        from app.api.v1 import news as news_mod

        async def mock_get(url, **kwargs):
            raise httpx.ConnectError("connection refused", request=MagicMock())

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            articles, statuses = await news_mod._fetch_all()

        self.assertEqual(articles, [])
        self.assertTrue(all(s["status"] == "error" for s in statuses))
        self.assertEqual(len(statuses), len(news_mod.RSS_FEEDS))

    async def test_fetch_is_concurrent(self):
        """All feeds are fetched in parallel — verified via overlapping execution counter."""
        from app.api.v1 import news as news_mod

        active_count = 0
        max_active = 0

        async def concurrent_get(url, **kwargs):
            nonlocal active_count, max_active
            active_count += 1
            max_active = max(max_active, active_count)
            await asyncio.sleep(0.02)  # yield so other tasks can start
            active_count -= 1
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=concurrent_get):
            await news_mod._fetch_all()

        # All feeds should have been active simultaneously at some point
        self.assertEqual(
            max_active, len(news_mod.RSS_FEEDS),
            f"Max concurrent fetches: {max_active}, expected {len(news_mod.RSS_FEEDS)} — fetches are sequential",
        )

    async def test_articles_sorted_by_date_descending(self):
        """Returned articles are sorted newest-first."""
        from app.api.v1 import news as news_mod

        rss_old = _RSS_ONE_ITEM.replace("Mon, 25 Apr 2026 10:00:00 GMT", "Mon, 24 Apr 2026 10:00:00 GMT")
        rss_new = _RSS_ONE_ITEM.replace("Mon, 25 Apr 2026 10:00:00 GMT", "Tue, 25 Apr 2026 12:00:00 GMT")
        responses = [rss_old, rss_new, _RSS_ONE_ITEM, _RSS_ONE_ITEM]
        idx = 0

        async def mock_get(url, **kwargs):
            nonlocal idx
            resp = _make_response(responses[idx % len(responses)])
            idx += 1
            return resp

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            articles, _ = await news_mod._fetch_all()

        dates = [a["published"] for a in articles]
        self.assertEqual(dates, sorted(dates, reverse=True))


# ---------------------------------------------------------------------------
# 3. Integration tests: GET /news via TestClient
# ---------------------------------------------------------------------------

class TestNewsEndpoint(unittest.TestCase):

    def setUp(self):
        from app.api.v1 import news as news_mod
        # Reset cache before each test
        news_mod._cache.articles = []
        news_mod._cache.expires_at = 0.0

    def _client(self):
        from app.main import app
        return TestClient(app)

    def test_cache_miss_fetches_and_returns_200(self):
        async def mock_get(url, **kwargs):
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            resp = self._client().get("/api/v1/news")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("articles", data)
        self.assertFalse(data["cached"])
        self.assertIn("sources_status", data)

    def test_cache_hit_skips_fetch(self):
        from app.api.v1 import news as news_mod
        news_mod._cache.articles = [{"title": "cached article", "source": "X",
                                     "link": "http://x.com", "description": "",
                                     "published": "", "image_url": ""}]
        news_mod._cache.expires_at = time.time() + 999

        called = []

        async def must_not_call(url, **kwargs):
            called.append(url)
            raise AssertionError("fetch should not happen on cache hit")

        with patch.object(httpx.AsyncClient, "get", side_effect=must_not_call):
            resp = self._client().get("/api/v1/news")

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["cached"])
        self.assertEqual(called, [])

    def test_partial_source_failure_still_200(self):
        """Endpoint returns 200 even when some RSS sources are down."""
        call_count = 0

        async def flaky_get(url, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise httpx.ConnectError("down", request=MagicMock())
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=flaky_get):
            resp = self._client().get("/api/v1/news")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("articles", data)
        statuses = data["sources_status"]
        failed = [s for s in statuses if s["status"] == "error"]
        ok = [s for s in statuses if s["status"] == "ok"]
        self.assertEqual(len(failed), 2)
        self.assertEqual(len(ok), 2)

    def test_all_sources_down_returns_empty_articles_200(self):
        async def always_fail(url, **kwargs):
            raise httpx.ConnectError("all down", request=MagicMock())

        with patch.object(httpx.AsyncClient, "get", side_effect=always_fail):
            resp = self._client().get("/api/v1/news")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["articles"], [])
        self.assertFalse(data["cached"])

    def test_response_shape_backward_compatible(self):
        """articles and cached keys always present — sources_status is additive."""
        async def mock_get(url, **kwargs):
            return _make_response(_RSS_ONE_ITEM)

        with patch.object(httpx.AsyncClient, "get", side_effect=mock_get):
            resp = self._client().get("/api/v1/news")

        data = resp.json()
        self.assertIn("articles", data)
        self.assertIn("cached", data)
        # sources_status is optional additive field (only on cache miss)
        article = data["articles"][0]
        for key in ("title", "description", "link", "published", "source", "image_url"):
            self.assertIn(key, article)


if __name__ == "__main__":
    unittest.main()
