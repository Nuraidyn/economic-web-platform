import time

import httpx

WORLD_BANK_BASE = "https://api.worldbank.org/v2/country"


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


def fetch_indicator_series(country: str, indicator: str, per_page: int = 200):
    params = {"format": "json", "per_page": per_page, "mrnev": 70}
    url = build_url(country, indicator)
    retries = 3
    delay_seconds = 0.4
    with httpx.Client(timeout=20, follow_redirects=True) as client:
        for attempt in range(retries + 1):
            resp = client.get(url, params=params)
            if resp.status_code in {429, 502, 503, 504} and attempt < retries:
                # World Bank API and transit proxies can occasionally return transient errors.
                time.sleep(delay_seconds * (attempt + 1))
                continue
            resp.raise_for_status()
            payload = resp.json()
            break
    if not isinstance(payload, list) or len(payload) < 2:
        raise ValueError("Unexpected response format from World Bank API")
    entries = filter(None, (normalize_entry(row) for row in payload[1]))
    return sorted(entries, key=lambda row: row["year"])
