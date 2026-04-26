"""Tests for bounded TTL authz cache (fix/authz-cache-bounded).

Coverage:
  Unit — _cache_get / _cache_set:
    - cache miss returns None, increments misses
    - cache hit returns stored value, increments hits
    - TTL expiry: entry absent after ttl seconds
    - maxsize eviction: oldest entry evicted when cache is full
    - failed tokens (AuthzInvalidToken) are NOT cached

  Integration smoke — introspect_with_django:
    - first call: cache miss → Django introspection called
    - second call (same token): cache hit → Django NOT called again
    - AuthzInvalidToken: Django returns 401/403, not cached
    - AuthzUnavailable: Django returns 500

  Diagnostics — get_cache_stats:
    - reflects current size, maxsize, ttl, hits, misses
"""
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

from cachetools import TTLCache


# ---------------------------------------------------------------------------
# Helper: reset module-level cache state between tests
# ---------------------------------------------------------------------------

def _reset_authz_module():
    """Clear the cache and zero counters before each test."""
    import app.services.authz as authz_mod
    authz_mod.clear_cache()


def _make_response(status_code: int, json_body: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json = MagicMock(return_value=json_body or {})
    resp.raise_for_status = MagicMock()
    return resp


_VALID_PAYLOAD = {"user_id": 42, "role": "user", "agreement_accepted": True}


# ---------------------------------------------------------------------------
# 1. Unit tests: _cache_get / _cache_set
# ---------------------------------------------------------------------------

class TestCacheGetSet(unittest.TestCase):

    def setUp(self):
        _reset_authz_module()

    def _ctx(self, user_id: int = 1):
        from app.services.authz import AuthzContext
        return AuthzContext(user_id=user_id, role="user", agreement_accepted=True)

    def test_cache_miss_returns_none(self):
        from app.services.authz import _cache_get
        self.assertIsNone(_cache_get("nonexistent-token"))

    def test_cache_miss_increments_misses(self):
        from app.services.authz import _cache_get, get_cache_stats
        _cache_get("tok-miss")
        stats = get_cache_stats()
        self.assertEqual(stats["misses"], 1)
        self.assertEqual(stats["hits"], 0)

    def test_cache_hit_returns_stored_value(self):
        from app.services.authz import _cache_get, _cache_set
        ctx = self._ctx()
        _cache_set("tok-1", ctx)
        result = _cache_get("tok-1")
        self.assertEqual(result, ctx)

    def test_cache_hit_increments_hits(self):
        from app.services.authz import _cache_get, _cache_set, get_cache_stats
        _cache_set("tok-2", self._ctx())
        _cache_get("tok-2")
        stats = get_cache_stats()
        self.assertEqual(stats["hits"], 1)

    def test_size_increases_on_set(self):
        from app.services.authz import _cache_set, get_cache_stats
        _cache_set("tok-a", self._ctx(1))
        _cache_set("tok-b", self._ctx(2))
        self.assertEqual(get_cache_stats()["size"], 2)

    def test_clear_resets_size_and_counters(self):
        from app.services.authz import _cache_set, _cache_get, get_cache_stats, clear_cache
        _cache_set("tok-x", self._ctx())
        _cache_get("tok-x")
        _cache_get("tok-missing")
        clear_cache()
        stats = get_cache_stats()
        self.assertEqual(stats["size"], 0)
        self.assertEqual(stats["hits"], 0)
        self.assertEqual(stats["misses"], 0)

    def test_ttl_expiry_returns_none(self):
        """Entry is absent after TTL seconds."""
        from cachetools import TTLCache
        from app.services.authz import AuthzContext, _CACHE_LOCK

        # Patch the module-level _CACHE with a 1-second TTL cache for this test
        import app.services.authz as authz_mod
        orig_cache = authz_mod._CACHE
        tiny_ttl_cache: TTLCache = TTLCache(maxsize=100, ttl=1)
        authz_mod._CACHE = tiny_ttl_cache
        try:
            authz_mod._cache_set("tok-ttl", AuthzContext(1, "user", True))
            # Immediately readable
            self.assertIsNotNone(authz_mod._cache_get("tok-ttl"))
            # After TTL, must be gone
            time.sleep(1.1)
            self.assertIsNone(authz_mod._cache_get("tok-ttl"))
        finally:
            authz_mod._CACHE = orig_cache

    def test_maxsize_eviction(self):
        """Oldest entry is evicted when maxsize is reached."""
        from cachetools import TTLCache
        from app.services.authz import AuthzContext

        import app.services.authz as authz_mod
        orig_cache = authz_mod._CACHE
        small_cache: TTLCache = TTLCache(maxsize=3, ttl=60)
        authz_mod._CACHE = small_cache
        try:
            authz_mod._cache_set("a", AuthzContext(1, "user", True))
            authz_mod._cache_set("b", AuthzContext(2, "user", True))
            authz_mod._cache_set("c", AuthzContext(3, "user", True))
            self.assertEqual(len(small_cache), 3)

            # Adding 4th entry forces eviction of the oldest
            authz_mod._cache_set("d", AuthzContext(4, "user", True))
            self.assertLessEqual(len(small_cache), 3,
                                 "Cache should not exceed maxsize=3 after inserting a 4th entry")
        finally:
            authz_mod._CACHE = orig_cache


# ---------------------------------------------------------------------------
# 2. Tests: invalid/expired tokens are NOT cached
# ---------------------------------------------------------------------------

class TestInvalidTokenNotCached(unittest.TestCase):

    def setUp(self):
        _reset_authz_module()

    def test_401_raises_authz_invalid_token(self):
        from app.services.authz import AuthzInvalidToken, introspect_with_django

        mock_resp = _make_response(401)
        with patch("httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = mock_resp
            with self.assertRaises(AuthzInvalidToken):
                introspect_with_django("bad-token")

    def test_403_raises_authz_invalid_token(self):
        from app.services.authz import AuthzInvalidToken, introspect_with_django

        mock_resp = _make_response(403)
        with patch("httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = mock_resp
            with self.assertRaises(AuthzInvalidToken):
                introspect_with_django("forbidden-token")

    def test_invalid_token_not_stored_in_cache(self):
        """After 401, the token must NOT be present in cache."""
        from app.services.authz import AuthzInvalidToken, introspect_with_django, _cache_get

        mock_resp = _make_response(401)
        with patch("httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = mock_resp
            try:
                introspect_with_django("bad-tok")
            except AuthzInvalidToken:
                pass

        self.assertIsNone(_cache_get("bad-tok"),
                          "401-rejected tokens must not be cached")

    def test_500_raises_authz_unavailable(self):
        from app.services.authz import AuthzUnavailable, introspect_with_django

        mock_resp = _make_response(500)
        with patch("httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = mock_resp
            with self.assertRaises(AuthzUnavailable):
                introspect_with_django("any-token")

    def test_network_error_raises_authz_unavailable(self):
        import httpx
        from app.services.authz import AuthzUnavailable, introspect_with_django

        with patch("httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.side_effect = (
                httpx.ConnectError("unreachable", request=MagicMock())
            )
            with self.assertRaises(AuthzUnavailable):
                introspect_with_django("any-token")


# ---------------------------------------------------------------------------
# 3. Integration smoke: introspect_with_django cache miss → hit
# ---------------------------------------------------------------------------

class TestIntrospectCacheBehavior(unittest.TestCase):

    def setUp(self):
        _reset_authz_module()

    def _mock_client(self, payload: dict, status: int = 200):
        resp = _make_response(status, payload)
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.get = MagicMock(return_value=resp)
        return mock_client

    def test_first_call_is_cache_miss_calls_django(self):
        from app.services.authz import introspect_with_django, get_cache_stats

        mock_client = self._mock_client(_VALID_PAYLOAD)
        with patch("httpx.Client", return_value=mock_client):
            ctx = introspect_with_django("token-first")

        self.assertEqual(ctx.user_id, 42)
        self.assertEqual(ctx.role, "user")
        self.assertTrue(ctx.agreement_accepted)
        # Django was called once
        mock_client.get.assert_called_once()
        stats = get_cache_stats()
        self.assertEqual(stats["misses"], 1)
        self.assertEqual(stats["hits"], 0)
        self.assertEqual(stats["size"], 1)

    def test_second_call_is_cache_hit_skips_django(self):
        from app.services.authz import introspect_with_django, get_cache_stats

        mock_client = self._mock_client(_VALID_PAYLOAD)
        with patch("httpx.Client", return_value=mock_client):
            introspect_with_django("token-repeat")
            ctx2 = introspect_with_django("token-repeat")

        self.assertEqual(ctx2.user_id, 42)
        # Django called exactly once (second call was a cache hit)
        mock_client.get.assert_called_once()
        stats = get_cache_stats()
        self.assertEqual(stats["hits"], 1)
        self.assertEqual(stats["misses"], 1)

    def test_different_tokens_cached_independently(self):
        from app.services.authz import introspect_with_django, get_cache_stats

        payload_a = {"user_id": 1, "role": "user", "agreement_accepted": True}
        payload_b = {"user_id": 2, "role": "admin", "agreement_accepted": True}

        client_a = self._mock_client(payload_a)
        client_b = self._mock_client(payload_b)

        with patch("httpx.Client", side_effect=[client_a, client_b]):
            ctx_a = introspect_with_django("token-a")
            ctx_b = introspect_with_django("token-b")

        self.assertEqual(ctx_a.user_id, 1)
        self.assertEqual(ctx_b.user_id, 2)
        self.assertEqual(get_cache_stats()["size"], 2)

    def test_invalid_schema_raises_unavailable(self):
        from app.services.authz import AuthzUnavailable, introspect_with_django

        bad_payload = {"user_id": "not-an-int", "role": "user", "agreement_accepted": True}
        mock_client = self._mock_client(bad_payload)
        with patch("httpx.Client", return_value=mock_client):
            with self.assertRaises(AuthzUnavailable):
                introspect_with_django("bad-schema-token")


# ---------------------------------------------------------------------------
# 4. Diagnostics: get_cache_stats
# ---------------------------------------------------------------------------

class TestCacheStats(unittest.TestCase):

    def setUp(self):
        _reset_authz_module()

    def test_stats_reflect_maxsize_and_ttl(self):
        from app.services.authz import get_cache_stats
        from app.core.config import AUTHZ_CACHE_MAXSIZE, AUTHZ_CACHE_TTL_SECONDS

        stats = get_cache_stats()
        self.assertEqual(stats["maxsize"], AUTHZ_CACHE_MAXSIZE)
        self.assertEqual(stats["ttl_seconds"], max(AUTHZ_CACHE_TTL_SECONDS, 1))

    def test_stats_size_zero_after_clear(self):
        from app.services.authz import _cache_set, get_cache_stats, clear_cache, AuthzContext
        _cache_set("s1", AuthzContext(1, "user", True))
        clear_cache()
        self.assertEqual(get_cache_stats()["size"], 0)

    def test_stats_thread_safe(self):
        """Stats can be read from multiple threads without raising."""
        from app.services.authz import _cache_set, get_cache_stats, AuthzContext

        errors = []

        def writer(n):
            try:
                for i in range(20):
                    _cache_set(f"tok-{n}-{i}", AuthzContext(i, "user", True))
            except Exception as exc:
                errors.append(exc)

        def reader():
            try:
                for _ in range(50):
                    get_cache_stats()
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=writer, args=(t,)) for t in range(5)]
        threads += [threading.Thread(target=reader) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [], f"Thread safety errors: {errors}")


if __name__ == "__main__":
    unittest.main()
