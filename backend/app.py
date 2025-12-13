import os
import time
from typing import Optional

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

WORLD_BANK_BASE = os.getenv(
    "WORLD_BANK_BASE_URL", "https://api.worldbank.org/v2/country"
)
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "900"))
DEBUG_MODE = os.getenv("FLASK_DEBUG", "0") == "1"


def build_world_bank_url(country: str, indicator: str) -> str:
    return f"{WORLD_BANK_BASE}/{country}/indicator/{indicator}"


def normalize_entry(entry: dict) -> Optional[dict]:
    value = entry.get("value")
    year = entry.get("date")
    if value is None or year is None:
        return None
    try:
        return {"year": int(year), "value": float(value)}
    except (TypeError, ValueError):
        return None


class ResponseCache:
    def __init__(self):
        self._store = {}

    def get(self, key: str):
        item = self._store.get(key)
        if not item:
            return None
        payload, expires_at = item
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return payload

    def set(self, key: str, payload):
        self._store[key] = (payload, time.time() + CACHE_TTL)


cache = ResponseCache()


def fetch_indicator(country: str, indicator: str):
    cache_key = f"{country}:{indicator}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    params = {"format": "json", "per_page": 100, "mrnev": 60}
    resp = requests.get(build_world_bank_url(country, indicator), params=params, timeout=15)
    resp.raise_for_status()
    payload = resp.json()

    if not isinstance(payload, list) or len(payload) < 2:
        raise ValueError("Unexpected response format from World Bank API")

    entries = filter(None, (normalize_entry(row) for row in payload[1]))
    series = sorted(entries, key=lambda row: row["year"])
    cache.set(cache_key, series)
    return series


@app.get("/health")
def healthcheck():
    return jsonify({"status": "ok"}), 200


@app.get("/api/data")
def get_indicator_data():
    country = request.args.get("country", "").lower()
    indicator = request.args.get("indicator", "").lower()
    start_year = request.args.get("start")
    end_year = request.args.get("end")

    if not country or not indicator:
        return jsonify({"error": "Missing required query parameters: country, indicator"}), 400

    try:
        series = fetch_indicator(country, indicator)
    except requests.RequestException as exc:
        return jsonify({"error": "World Bank API request failed", "details": str(exc)}), 502
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500

    def within_range(entry):
        if start_year and entry["year"] < int(start_year):
            return False
        if end_year and entry["year"] > int(end_year):
            return False
        return True

    filtered = [entry for entry in series if within_range(entry)]
    return jsonify(filtered)


if __name__ == "__main__":
    # Default to production-friendly mode unless FLASK_DEBUG=1 is provided.
    app.run(debug=DEBUG_MODE, use_reloader=DEBUG_MODE)
