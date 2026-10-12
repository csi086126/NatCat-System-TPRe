"""Publish the pre-computed HK annual-metric GeoTIFFs to GeoServer.

The TIFs come from ``scripts/generate-hk-flood-hazard-products.mjs`` and are placed
under ``scripts/generated/hk-flood-hazard/``. To make GeoServer happy on Windows we
mirror the existing HK layout (``HK_Flood_NONTC_R100/HK_Flood_NONTC_R100.geotiff``):
each TIF is copied to ``<GEOSERVER_HOME>/data/natcat_platform/<store>/<store>.geotiff``,
and a GeoTIFF coverage store / coverage is created via REST that points at that path.

Credentials are read from ``.env`` (``GEOSERVER_URL`` / ``GEOSERVER_USER`` /
``GEOSERVER_PASS``); ``GEOSERVER_HOME`` defaults to ``C:/ProgramData/GeoServer``.

Run:
    python scripts/publish-hk-annual-metrics.py
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

WORKSPACE = "natcat_platform"
# GeoServer 数据根目录:本仓库的标准是 C:\ProgramData\GeoServer\data\natcat_platform\
# (HK_Flood_NONTC_R100 等图层的实际位置)。Shell 环境里的 GEOSERVER_HOME 经常被
# GeoServer 安装程序设为 C:\Program Files\GeoServer(那是安装目录而非数据目录),所以
# 这里直接用硬编码 + .env 覆盖,避免踩坑。
DEFAULT_GEOSERVER_HOME = r"C:\ProgramData\GeoServer"

SOURCE_DIR = PROJECT_ROOT / "scripts" / "generated" / "hk-flood-hazard"

# 4 个输出 TIF:每个生成 1 个 coverage store + 1 个 coverage。
LAYERS = [
    "HK_Flood_NONTC_AnnualProbability_GT015m",
    "HK_Flood_NONTC_AnnualizedExcessDepth_GT015m",
    "HK_Flood_Compound_AnnualProbability_GT015m",
    "HK_Flood_Compound_AnnualizedExcessDepth_GT015m",
]


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
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
        """删除已存在的 store(含其下所有 coverage)。
        重新发布前调用,避免 GeoServer 缓存旧的 GeoTIFF 元数据(几何/格式可能变了)。"""
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores/{store_name}?recurse=true")
        response = requests.delete(url, auth=self.auth, timeout=30)
        if response.status_code in (200, 404):
            print(f"  [OK] Deleted store {store_name}")
            return
        raise RuntimeError(f"delete {store_name}: HTTP {response.status_code} {response.text[:160]}")

    def create_store(self, store_name: str) -> None:
        """Create a GeoTIFF coverage store pointing at ``<DATA_DIR>/<store>/<store>.geotiff``."""
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores")
        body = {
            "coverageStore": {
                "name": store_name,
                "type": "GeoTIFF",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "url": f"file:data/{WORKSPACE}/{store_name}/{store_name}.geotiff",
            }
        }
        response = requests.post(url, auth=self.auth, json=body, headers=self.headers, timeout=60)
        if response.status_code == 201:
            print(f"  [OK] Created coverage store {store_name}")
            return
        if response.status_code == 409 or "already exists" in response.text:
            print(f"  [INFO] Coverage store {store_name} already exists")
            return
        raise RuntimeError(
            f"create store {store_name}: HTTP {response.status_code} {response.text[:200]}"
        )

    def publish_coverage(self, store_name: str, layer_name: str) -> None:
        url = self.rest(
            f"/workspaces/{WORKSPACE}/coveragestores/{store_name}/coverages?configure=all"
        )
        body = {
            "coverage": {
                "name": layer_name,
                "title": layer_name.replace("_", " "),
                "enabled": True,
            }
        }
        response = requests.post(url, auth=self.auth, json=body, headers=self.headers, timeout=60)
        if response.status_code == 201:
            print(f"  [OK] Published coverage {layer_name}")
        elif response.status_code == 500 and "already exists" in response.text:
            print(f"  [INFO] Coverage {layer_name} already exists")
        else:
            check = requests.get(
                self.rest(f"/workspaces/{WORKSPACE}/coveragestores/{store_name}/coverages/{layer_name}.json"),
                auth=self.auth,
                timeout=30,
            )
            if check.status_code != 200:
                raise RuntimeError(
                    f"publish {layer_name}: HTTP {response.status_code} {response.text[:200]}"
                )
            print(f"  [INFO] Coverage {layer_name} already configured")

        # POST configure=all 在 GeoServer 上经常不写 supportedFormats / nativeFormat / SRS,
        # 不补这一刀,WCS GetCoverage 会报 "format GeoTIFF is not supported"。
        self._configure_coverage(store_name, layer_name)

    def _configure_coverage(self, store_name: str, layer_name: str) -> None:
        url = self.rest(
            f"/workspaces/{WORKSPACE}/coveragestores/{store_name}/coverages/{layer_name}.json"
        )
        body = {
            "coverage": {
                "name": layer_name,
                "title": layer_name.replace("_", " "),
                "enabled": True,
                "supportedFormats": {"string": ["GEOTIFF"]},
                "nativeFormat": "GEOTIFF",
                "requestSRS": {"string": "EPSG:2326"},
                "responseSRS": {"string": "EPSG:2326"},
            }
        }
        response = requests.put(url, auth=self.auth, json=body, headers=self.headers, timeout=60)
        if response.status_code != 200:
            raise RuntimeError(
                f"configure {layer_name}: HTTP {response.status_code} {response.text[:200]}"
            )
        print(f"  [OK] Configured coverage {layer_name} (EPSG:2326, GEOTIFF)")

    def apply_default_style(self, layer_name: str) -> None:
        """Set default style to ``raster``. Style 不存在也不算失败。"""
        url = self.rest(f"/layers/{WORKSPACE}:{layer_name}")
        body = {"layer": {"defaultStyle": {"name": "raster"}}}
        response = requests.put(url, auth=self.auth, json=body, headers=self.headers, timeout=30)
        if response.status_code == 200:
            print(f"  [OK] Applied raster style to {layer_name}")
        else:
            print(f"  [WARN] Style apply returned {response.status_code}; relying on GeoServer default")


def stage_geotiff(layer_name: str, data_dir: Path) -> Path:
    """Copy ``scripts/generated/.../<layer>.tif`` to ``<DATA_DIR>/<layer>/<layer>.geotiff``."""
    src = SOURCE_DIR / f"{layer_name}.tif"
    if not src.exists():
        raise FileNotFoundError(f"Source TIF missing: {src}. Run generate-hk-flood-hazard-products.mjs first.")
    dst_dir = data_dir / layer_name
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / f"{layer_name}.geotiff"
    shutil.copy2(src, dst)
    print(f"  [OK] Copied {src.name} -> {dst}")
    return dst


def main() -> int:
    env = load_env(ENV_FILE)
    base_url = env.get("GEOSERVER_INTERNAL_URL") or env.get("GEOSERVER_URL") or "http://localhost:8080/geoserver"
    user = env.get("GEOSERVER_USER") or "chensi"
    password = env.get("GEOSERVER_PASS")
    if not password:
        print("[ERROR] GEOSERVER_PASS not set in .env", file=sys.stderr)
        return 1
    # .env 优先(.env.example 里默认 C:/ProgramData/GeoServer),再回落到硬编码默认值。
    geoserver_home = Path(env.get("GEOSERVER_HOME") or DEFAULT_GEOSERVER_HOME)
    data_dir = geoserver_home / "data" / WORKSPACE
    print(f"GeoServer: {base_url}")
    print(f"Data dir:  {data_dir}")
    print(f"Source:    {SOURCE_DIR}")
    client = GeoServerClient(base_url, user, password)

    for layer_name in LAYERS:
        print(f"\n[{layer_name}]")
        # 几何可能变了(重新生成),所以总是删旧的再重建,避免 GeoServer 缓存旧元数据
        client.delete_store(layer_name)
        stage_geotiff(layer_name, data_dir)
        client.create_store(layer_name)
        client.publish_coverage(layer_name, layer_name)
        client.apply_default_style(layer_name)

    print("\n[OK] All 4 HK annual metric layers published.")
    print("Layers:")
    for layer_name in LAYERS:
        print(f"  natcat_platform:{layer_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())