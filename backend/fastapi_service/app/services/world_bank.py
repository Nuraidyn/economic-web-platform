import asyncio
import time
from datetime import datetime, timezone
from threading import Lock

import httpx

WORLD_BANK_BASE = "https://api.worldbank.org/v2/country"
WB_START_YEAR = 1990

# Simple in-memory TTL cache shared between sync and async callers.
_CACHE: dict[tuple, tuple[list, float]] = {}
_CACHE_LOCK = Lock()
CACHE_TTL_SECONDS = 3600  # 1 hour


def build_url(country: str, indicator: str) -> str:
    return f"{WORLD_BANK_BASE}/{country}/indicator/{indicator}"


def normalize_entry(entry: dict):
    value = entry.get("value")
    year = entry.get("date")
    if value is None or year is None:
        return None
    try:
        return {"year": int(year), "value": float(value)}
    except (TypeError, ValueError):
        return None


def _parse_payload(payload) -> list:
    if not isinstance(payload, list) or len(payload) < 2:
        raise ValueError("Unexpected response format from World Bank API")
    entries = filter(None, (normalize_entry(row) for row in payload[1]))
    return sorted(entries, key=lambda row: row["year"])


def _get_cached(key: tuple) -> list | None:
    with _CACHE_LOCK:
        if key in _CACHE:
            data, expires_at = _CACHE[key]
            if time.monotonic() < expires_at:
                return data
    return None


def _set_cached(key: tuple, result: list) -> None:
    with _CACHE_LOCK:
        _CACHE[key] = (result, time.monotonic() + CACHE_TTL_SECONDS)


def fetch_indicator_series(country: str, indicator: str, per_page: int = 200) -> list:
    """Synchronous fetch with in-memory TTL cache."""
    key = (country.upper(), indicator, per_page)
    cached = _get_cached(key)
    if cached is not None:
        return cached

    current_year = datetime.now(timezone.utc).year
    params = {"format": "json", "per_page": per_page, "date": f"{WB_START_YEAR}:{current_year}"}
    url = build_url(country, indicator)
    retries = 3
    delay_seconds = 0.4
    with httpx.Client(timeout=40, follow_redirects=True) as client:
        for attempt in range(retries + 1):
            resp = client.get(url, params=params)
            if resp.status_code in {429, 502, 503, 504} and attempt < retries:
                time.sleep(delay_seconds * (attempt + 1))
                continue
            resp.raise_for_status()
            payload = resp.json()
            break

    result = _parse_payload(payload)
    _set_cached(key, result)
    return result


async def async_fetch_indicator_series(country: str, indicator: str, per_page: int = 200) -> list:
    """Async fetch with the same in-memory TTL cache as the sync version."""
    key = (country.upper(), indicator, per_page)
    cached = _get_cached(key)
    if cached is not None:
        return cached

    current_year = datetime.now(timezone.utc).year
    params = {"format": "json", "per_page": per_page, "date": f"{WB_START_YEAR}:{current_year}"}
    url = build_url(country, indicator)
    retries = 3
    delay_seconds = 0.4
    async with httpx.AsyncClient(timeout=40, follow_redirects=True) as client:
        for attempt in range(retries + 1):
            resp = await client.get(url, params=params)
            if resp.status_code in {429, 502, 503, 504} and attempt < retries:
                await asyncio.sleep(delay_seconds * (attempt + 1))
                continue
            resp.raise_for_status()
            payload = resp.json()
            break

    result = _parse_payload(payload)
    _set_cached(key, result)
    return result
