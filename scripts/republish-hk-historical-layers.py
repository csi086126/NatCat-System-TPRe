"""Republish the Hong Kong historical flood layers to GeoServer via REST.

After ``fix-hk-historical-crs.py`` rewrites the 425 ``HK_Flood_HistEvent_*``
GeoTIFFs with EPSG:2326, this script deletes and recreates every historical
coverage so GeoServer rebuilds its grid geometry from the fixed files
(previously the geotiffs had no CRS, so EPSG:4326 WCS queries failed and
WMS rendered blank).

Credentials are read from ``.env`` (GEOSERVER_URL / GEOSERVER_USER /
GEOSERVER_PASS).

Run with the ``GeoMet`` conda environment:
    C:\\Users\\sichen\\AppData\\Local\\anaconda3\\envs\\GeoMet\\python.exe scripts/republish-hk-historical-layers.py
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

WORKSPACE = "natcat_platform"
# GeoServer 安装/数据根目录。Windows 默认 C:\ProgramData\GeoServer;Linux/容器下指向挂载的 /opt/geoserver/data。
GEOSERVER_HOME = Path(os.getenv("GEOSERVER_HOME", r"C:\ProgramData\GeoServer"))
DATA_DIR = GEOSERVER_HOME / "data" / "natcat_platform"
LAYER_PREFIX = "HK_Flood_HistEvent_"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


class GeoServerClient:
    def __init__(self, base_url: str, user: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth = (user, password)
        self.headers = {"Content-Type": "application/json"}

    def rest(self, path: str) -> str:
        return f"{self.base_url}/rest{path}"

    def delete_store(self, store_name: str) -> None:
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores/{store_name}?recurse=true")
        response = requests.delete(url, auth=self.auth, timeout=30)
        if response.status_code not in (200, 404):
            raise RuntimeError(f"delete {store_name}: HTTP {response.status_code} {response.text[:160]}")

    def create_store(self, store_name: str) -> None:
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores")
        data = {
            "coverageStore": {
                "name": store_name,
                "type": "GeoTIFF",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "url": f"file:data/natcat_platform/{store_name}/{store_name}.geotiff",
            }
        }
        response = requests.post(url, auth=self.auth, json=data, headers=self.headers, timeout=30)
        if response.status_code not in (201, 409) and "already exists" not in response.text:
            raise RuntimeError(f"create store {store_name}: HTTP {response.status_code} {response.text[:160]}")

    def publish_coverage(self, store_name: str) -> None:
        url = self.rest(
            f"/workspaces/{WORKSPACE}/coveragestores/{store_name}/coverages?configure=all"
        )
        data = {"coverage": {"name": store_name, "title": store_name, "enabled": True}}
        response = requests.post(url, auth=self.auth, json=data, headers=self.headers, timeout=30)
        if response.status_code not in (201,) and "already exists" not in response.text:
            raise RuntimeError(f"publish {store_name}: HTTP {response.status_code} {response.text[:160]}")

    def layer_exists(self, store_name: str) -> bool:
        url = self.rest(f"/layers/{WORKSPACE}:{store_name}.json")
        response = requests.get(url, auth=self.auth, timeout=20)
        return response.status_code == 200


def republish(client: GeoServerClient, store_name: str, delay: float = 0.15) -> bool:
    try:
        client.delete_store(store_name)
        time.sleep(delay)
        client.create_store(store_name)
        time.sleep(delay)
        client.publish_coverage(store_name)
        return True
    except Exception as error:  # noqa: BLE001
        print(f"    FAIL: {error}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Republish HK historical flood layers on GeoServer via REST."
    )
    parser.add_argument("--dry-run", action="store_true", help="Only list layers to republish")
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    base_url = env.get("GEOSERVER_URL", "http://localhost:8080/geoserver")
    user = env.get("GEOSERVER_USER", "")
    password = env.get("GEOSERVER_PASS", "")
    if not user or not password:
        print("[ERROR] GEOSERVER_USER/GEOSERVER_PASS missing in .env", file=sys.stderr)
        return 1

    client = GeoServerClient(base_url, user, password)

    # Discover stores on disk
    stores = sorted(
        path.parent.name
        for path in DATA_DIR.glob(f"{LAYER_PREFIX}*/*.geotiff")
        if path.parent.name.startswith(LAYER_PREFIX)
    )
    if not stores:
        print(f"[ERROR] No {LAYER_PREFIX}* geotiffs found under {DATA_DIR}", file=sys.stderr)
        return 1
    print(f"Found {len(stores)} historical layer geotiffs under {DATA_DIR}")

    if args.dry_run:
        print("DRY RUN - layers that would be republished:")
        for store in stores:
            print(f"  {WORKSPACE}:{store}")
        return 0

    ok = 0
    failed: list[str] = []
    for index, store in enumerate(stores, 1):
        success = republish(client, store)
        if success:
            ok += 1
        else:
            failed.append(store)
        print(f"[{index}/{len(stores)}] {store}: {'OK' if success else 'FAIL'}")

    print(f"\nDone. {ok}/{len(stores)} republished.")
    if failed:
        print(f"FAILED ({len(failed)}):")
        for store in failed:
            print(f"  {store}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
