"""Ensure every HK historical coverage declares nativeFormat=GeoTIFF.

Coverages created via the GeoServer REST API (POST ``?configure=all``) are
persisted without a ``nativeFormat`` element, which makes WCS 1.0.0 reject
``FORMAT=GeoTIFF`` ("format GeoTIFF is not supported for this coverage").
This script reads each ``HK_Flood_HistEvent_*`` coverage, injects
``<nativeFormat>GeoTIFF</nativeFormat>`` when missing, and PUTs it back so the
XML on disk carries the format.  A GeoServer restart is required afterwards for
the running coverage objects to pick the change up.

Run with the ``GeoMet`` conda environment.
"""

from __future__ import annotations

import argparse
import re
import sys

import requests

PROJECT_ROOT = __import__("pathlib").Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
WORKSPACE = "natcat_platform"
PREFIX = "HK_Flood_HistEvent_"


def load_env(path) -> dict[str, str]:
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def main() -> int:
    parser = argparse.ArgumentParser(description="Inject nativeFormat=GeoTIFF into HK historical coverages.")
    parser.add_argument("--dry-run", action="store_true", help="Only report coverages that would be updated")
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    base = env.get("GEOSERVER_URL", "http://localhost:8080/geoserver").rstrip("/")
    auth = (env.get("GEOSERVER_USER", ""), env.get("GEOSERVER_PASS", ""))
    if not auth[0] or not auth[1]:
        print("[ERROR] GEOSERVER_USER/GEOSERVER_PASS missing in .env", file=sys.stderr)
        return 1

    # Discover stores via REST catalog
    response = requests.get(
        f"{base}/rest/workspaces/{WORKSPACE}/coveragestores.json", auth=auth, timeout=30
    )
    if response.status_code != 200:
        print(f"[ERROR] Cannot list coveragestores: HTTP {response.status_code}", file=sys.stderr)
        return 1
    stores = [s["name"] for s in response.json()["coverageStores"]["coverageStore"]
              if s["name"].startswith(PREFIX)]
    print(f"Found {len(stores)} HK historical coverages")

    updated = 0
    already = 0
    failed: list[str] = []
    for index, store in enumerate(stores, 1):
        url = f"{base}/rest/workspaces/{WORKSPACE}/coveragestores/{store}/coverages/{store}"
        try:
            get = requests.get(f"{url}.xml", auth=auth, timeout=20)
            if get.status_code != 200:
                raise RuntimeError(f"GET HTTP {get.status_code}")
            xml = get.text
            if "<nativeFormat>" in xml:
                already += 1
                continue
            new_xml = re.sub(r"(<coverage>)", r"\1\n  <nativeFormat>GeoTIFF</nativeFormat>", xml, count=1)
            if args.dry_run:
                updated += 1
                continue
            put = requests.put(url, auth=auth, data=new_xml.encode("utf-8"),
                               headers={"Content-Type": "application/xml"}, timeout=20)
            if put.status_code != 200:
                raise RuntimeError(f"PUT HTTP {put.status_code} {put.text[:100]}")
            updated += 1
        except Exception as error:  # noqa: BLE001
            failed.append(f"{store}: {error}")
        if (index % 50) == 0:
            print(f"  [{index}/{len(stores)}] updated={updated} already={already} failed={len(failed)}")

    print(f"\nDone. updated={updated} already={already} failed={len(failed)}")
    if failed:
        print("FAILED:")
        for item in failed[:20]:
            print(f"  {item}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
