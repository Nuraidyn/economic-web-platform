import argparse
import time

import httpx

from app.data.baseline import BASELINE_COUNTRIES, BASELINE_INDICATORS


def build_headers(token: str | None):
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def ingest_indicator(
    client: httpx.Client,
    base_url: str,
    country: str,
    indicator: str,
    retries: int,
    delay: float,
):
    attempt = 0
    while True:
        attempt += 1
        response = client.post(
            f"{base_url}/ingest/world-bank",
            json={"country": country, "indicator": indicator},
        )
        if response.status_code < 400:
            return response.json()
        if response.status_code in {429, 502, 503} and attempt <= retries:
            time.sleep(delay * attempt)
            continue
        response.raise_for_status()


def list_runs(client: httpx.Client, base_url: str):
    response = client.get(f"{base_url}/ingest/runs")
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Ingest baseline indicators into FastAPI.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8001/api/v1")
    parser.add_argument("--token", required=True, help="JWT access token for researcher/admin")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between requests")
    parser.add_argument("--retries", type=int, default=2, help="Retries for 429/502/503 responses")
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue ingestion after a failed request",
    )
    args = parser.parse_args()

    headers = build_headers(args.token)
    with httpx.Client(headers=headers, timeout=60) as client:
        for country in BASELINE_COUNTRIES:
            for indicator in BASELINE_INDICATORS:
                print(f"Ingesting {country} {indicator}...")
                try:
                    result = ingest_indicator(
                        client,
                        args.base_url,
                        country,
                        indicator,
                        retries=args.retries,
                        delay=args.delay,
                    )
                    print(
                        f"Inserted {result['inserted']} / {result['total']} (missing {result['missing']})"
                    )
                except httpx.HTTPStatusError as exc:
                    print(f"Failed {country} {indicator}: {exc.response.status_code}")
                    if not args.continue_on_error:
                        raise
                time.sleep(args.delay)
        runs = list_runs(client, args.base_url)
        print(f"Latest runs: {len(runs)}")
        if runs:
            latest = runs[0]
            print(
                f"Most recent run {latest['id']} status={latest['status']} missing={latest['missing']}"
            )


if __name__ == "__main__":
    main()
