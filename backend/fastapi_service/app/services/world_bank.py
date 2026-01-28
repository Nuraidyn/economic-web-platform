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
    with httpx.Client(timeout=15) as client:
        resp = client.get(build_url(country, indicator), params=params)
        resp.raise_for_status()
        payload = resp.json()
    if not isinstance(payload, list) or len(payload) < 2:
        raise ValueError("Unexpected response format from World Bank API")
    entries = filter(None, (normalize_entry(row) for row in payload[1]))
    return sorted(entries, key=lambda row: row["year"])
