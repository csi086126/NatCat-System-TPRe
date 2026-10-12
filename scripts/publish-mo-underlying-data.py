"""
把 D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據For_TAIPINGRE 下的
澳门底层空间数据接入 GeoServer。

输入目录(全部处理,共 19 个数据集):
  DEM_with channel/DEM_with channel.tif                 → coverage: MO_DEM_with_channel

  土地利用/CDROM_C/{boundary,centerline,doorNo,lake,lote,monte,place,ponte,
                   predio,rua,terra,tower,verde}/*.shp   → 各一个 datastore + layer

  建築分類/final_estimated_tiv_selected_fields_BITIV.shp → MO_Building_TIV
  澳门区划边界数据WGS84坐标/.../澳门区划边界数据WGS84坐标.shp → MO_DistrictBoundary
  澳门区划边界数据WGS84坐标/澳门统计区（WGS84坐标系）/澳门统计区（WGS84坐标系）.shp → MO_StatArea
  管網/{whole_link,whole_manhole,whole_outlet}.shp      → MO_Pipe_Link / MO_Pipe_Manhole / MO_Pipe_Outlet

CRS 策略:
  大多数数据使用 Observatorio_Meteorologico_1965_Macau_Grid(澳门本地 TMercator,
  无标准 EPSG)。GeoServer 会在 WMS 输出时自动 reproject 到 EPSG:4326。
  仅 MO_DistrictBoundary 自身就�� WGS84。

不依赖 fiona / gdal: 用 ?configure=all 让 GeoServer 自动读 datastore schema。

运行:
  python scripts/publish-mo-underlying-data.py
"""

import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

# 加载项目根 .env
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://localhost:8080/geoserver").rstrip("/")
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "chensi")
GEOSERVER_PASS = os.getenv("GEOSERVER_PASS", "")
WORKSPACE = "natcat_platform"

MO_ROOT = Path(r"D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據For_TAIPINGRE")

# 19 个数据集 → datastore/layer 配置
DATASETS: List[Dict] = [
    # ----- TIF coverages -----
    {
        "kind": "tif",
        "datastore": "MO_DEM_TIF",
        "tif_path": MO_ROOT / "DEM_with channel" / "DEM_with channel.tif",
        "layer": "MO_DEM_with_channel",
        "title": "Macau DEM (5m)",
        "abstract": "Macau 5m resolution DEM (Observatorio_Meteorologico_1965_Macau_Grid)",
        "style": "dem",
    },

    # ----- 区划/边界 -----
    {
        "kind": "shp",
        "datastore": "MO_DistrictBoundary",
        "shp_path": MO_ROOT / "澳门区划边界数据WGS84坐标" / "澳门区划边界数据WGS84坐标" / "澳门区划边界数据WGS84坐标.shp",
        "layer": "MO_DistrictBoundary",
        "title": "Macau District Boundary (WGS84)",
        "abstract": "Macau district boundaries (already in WGS84)",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_StatArea",
        "shp_path": MO_ROOT / "澳门区划边界数据WGS84坐标" / "澳门统计区（WGS84坐标系）" / "澳门统计区（WGS84坐标系）.shp",
        "layer": "MO_StatArea",
        "title": "Macau Statistical Area",
        "abstract": "Macau statistical areas (Macau local grid -> WGS84)",
        "style": "polygon",
    },

    # ----- 建筑分类 -----
    {
        "kind": "shp",
        "datastore": "MO_Building_TIV",
        "shp_path": MO_ROOT / "建築分類" / "final_estimated_tiv_selected_fields_BITIV.shp",
        "layer": "MO_Building_TIV",
        "title": "Macau Buildings (TIV Classification)",
        "abstract": "Macau buildings with TIV (Total Insured Value) classification",
        "style": "polygon",
    },

    # ----- 土地利用 13 个子类别 -----
    {
        "kind": "shp",
        "datastore": "MO_LU_Boundary",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "boundary" / "boundary.shp",
        "layer": "MO_LU_Boundary",
        "title": "Macau Land Use — Boundary",
        "abstract": "Macau land-use boundary lines",
        "style": "line",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Centerline",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "centerline" / "centerline.shp",
        "layer": "MO_LU_Centerline",
        "title": "Macau Land Use — Centerline",
        "abstract": "Macau land-use centerlines",
        "style": "line",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_DoorNo",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "doorNo" / "doorNo.shp",
        "layer": "MO_LU_DoorNo",
        "title": "Macau Land Use — Door Numbers",
        "abstract": "Macau land-use door numbers (point labels)",
        "style": "point",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Lake",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "lake" / "lake.shp",
        "layer": "MO_LU_Lake",
        "title": "Macau Land Use — Lake",
        "abstract": "Macau land-use lake polygons",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Lote",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "lote" / "lote.shp",
        "layer": "MO_LU_Lote",
        "title": "Macau Land Use — Lots",
        "abstract": "Macau land-use lots/parcels",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Monte",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "monte" / "monte.shp",
        "layer": "MO_LU_Monte",
        "title": "Macau Land Use — Monte (Shrubs)",
        "abstract": "Macau land-use monte (shrub/wooded areas)",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Place",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "place" / "place.shp",
        "layer": "MO_LU_Place",
        "title": "Macau Land Use — Places",
        "abstract": "Macau land-use places/POIs",
        "style": "point",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Ponte",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "ponte" / "ponte.shp",
        "layer": "MO_LU_Ponte",
        "title": "Macau Land Use — Bridges",
        "abstract": "Macau land-use bridges",
        "style": "line",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Predio",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "predio" / "predio.shp",
        "layer": "MO_LU_Predio",
        "title": "Macau Land Use — Buildings",
        "abstract": "Macau land-use building footprints (predio)",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Rua",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "rua" / "rua.shp",
        "layer": "MO_LU_Rua",
        "title": "Macau Land Use — Streets",
        "abstract": "Macau land-use streets (rua)",
        "style": "line",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Terra",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "terra" / "terra.shp",
        "layer": "MO_LU_Terra",
        "title": "Macau Land Use — Land",
        "abstract": "Macau land-use land polygons",
        "style": "polygon",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Tower",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "tower" / "tower.shp",
        "layer": "MO_LU_Tower",
        "title": "Macau Land Use — Tower",
        "abstract": "Macau land-use tower structures",
        "style": "point",
    },
    {
        "kind": "shp",
        "datastore": "MO_LU_Verde",
        "shp_path": MO_ROOT / "土地利用" / "CDROM_C" / "verde" / "verde.shp",
        "layer": "MO_LU_Verde",
        "title": "Macau Land Use — Green",
        "abstract": "Macau land-use green spaces",
        "style": "polygon",
    },

    # ----- 管網系统 -----
    {
        "kind": "shp",
        "datastore": "MO_Pipe_Link",
        "shp_path": MO_ROOT / "管網" / "whole_link.shp",
        "layer": "MO_Pipe_Link",
        "title": "Macau Pipe — Links",
        "abstract": "Macau drainage/sewage pipe links (lines)",
        "style": "line",
    },
    {
        "kind": "shp",
        "datastore": "MO_Pipe_Manhole",
        "shp_path": MO_ROOT / "管網" / "whole_manhole.shp",
        "layer": "MO_Pipe_Manhole",
        "title": "Macau Pipe — Manholes",
        "abstract": "Macau drainage/sewage manholes (points)",
        "style": "point",
    },
    {
        "kind": "shp",
        "datastore": "MO_Pipe_Outlet",
        "shp_path": MO_ROOT / "管網" / "whole_outlet.shp",
        "layer": "MO_Pipe_Outlet",
        "title": "Macau Pipe — Outlets",
        "abstract": "Macau drainage/sewage outlets (points)",
        "style": "point",
    },
]


class GeoServerPublisher:
    def __init__(self):
        self.base = GEOSERVER_URL
        self.rest = f"{self.base}/rest"
        self.auth = HTTPBasicAuth(GEOSERVER_USER, GEOSERVER_PASS)
        self.headers = {"Content-Type": "application/json"}
        self._test()

    def _test(self):
        r = requests.get(f"{self.rest}/about/version",
                         auth=self.auth, timeout=8,
                         headers={"Accept": "application/json"})
        if r.status_code != 200:
            sys.exit(f"❌ 无法连接 GeoServer ({self.base}): HTTP {r.status_code}")
        try:
            ver = r.json().get("about", {}).get("resource", [{}])[0].get("Version", "?")
        except Exception:
            ver = "?"
        print(f"✅ 已连接 GeoServer {self.base} (v{ver})\n")

    # ---------- workspace ----------
    def ensure_workspace(self):
        url = f"{self.rest}/workspaces/{WORKSPACE}"
        r = requests.get(url, auth=self.auth)
        if r.status_code == 200:
            print(f"✅ workspace '{WORKSPACE}' 已存在")
            return
        body = {"workspace": {"name": WORKSPACE}}
        r = requests.post(f"{self.rest}/workspaces", auth=self.auth,
                          json=body, headers=self.headers)
        if r.status_code in (201, 409):
            print(f"✅ 已创建 workspace '{WORKSPACE}'")
        else:
            sys.exit(f"❌ 创建 workspace 失败: {r.status_code} {r.text}")

    # ---------- TIF ----------
    def publish_tif(self, ds: Dict) -> bool:
        ds_name = ds["datastore"]
        tif = ds["tif_path"]
        if not tif.exists():
            print(f"  ❌ 文件不存在: {tif}")
            return False
        file_url = "file:///" + str(tif).replace("\\", "/")
        body = {
            "coverageStore": {
                "name": ds_name,
                "type": "GeoTIFF",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "url": file_url,
            }
        }
        r = requests.post(f"{self.rest}/workspaces/{WORKSPACE}/coveragestores",
                          auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 201:
            print(f"  ✅ coverageStore '{ds_name}' 已创建")
        elif r.status_code == 500 and "already exists" in r.text:
            print(f"  ℹ️  coverageStore '{ds_name}' 已存在")
        else:
            print(f"  ❌ 创建 coverageStore 失败: {r.status_code} {r.text[:200]}")
            return False

        # 发布 coverage
        layer = ds["layer"]
        cov_url = (f"{self.rest}/workspaces/{WORKSPACE}/coveragestores/{ds_name}"
                   f"/coverages?configure=all")
        body = {
            "coverage": {
                "name": layer,
                "title": ds.get("title", layer),
                "abstract": ds.get("abstract", ""),
                "enabled": True,
                "srs": "EPSG:4326",  # declared SRS → WMS 自动 reproject
            }
        }
        r = requests.post(cov_url, auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 201:
            print(f"  ✅ coverage '{layer}' 已发布")
        elif r.status_code == 500 and "already exists" in r.text:
            print(f"  ℹ️  coverage '{layer}' 已存在")
        else:
            # 检查 GET
            chk = requests.get(f"{cov_url.rsplit('?', 1)[0]}/{layer}.json",
                               auth=self.auth)
            if chk.status_code == 200:
                print(f"  ℹ️  coverage '{layer}' 已配置")
            else:
                print(f"  ❌ 发布 coverage 失败: {r.status_code} {r.text[:200]}")
                return False

        self._apply_default_style(layer, ds.get("style", "raster"))
        return True

    # ---------- Shapefile (不依赖 fiona) ----------
    def publish_shp(self, ds: Dict) -> bool:
        ds_name = ds["datastore"]
        shp = ds["shp_path"]
        if not shp.exists():
            print(f"  ❌ 文件不存在: {shp}")
            return False
        shp_dir = shp.parent
        for ext in (".shp", ".dbf", ".shx"):
            if not (shp_dir / (shp.stem + ext)).exists():
                print(f"  ⚠️  缺失兄弟文件 {shp.stem}{ext},继续尝试")

        # 1. 创建 datastore
        file_url = "file:///" + str(shp).replace("\\", "/")
        body = {
            "dataStore": {
                "name": ds_name,
                "type": "Shapefile",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "connectionParameters": {
                    "entry": [
                        {"@key": "url", "$": file_url},
                        {"@key": "charset", "$": "UTF-8"},
                    ]
                },
            }
        }
        r = requests.post(f"{self.rest}/workspaces/{WORKSPACE}/datastores",
                          auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 201:
            print(f"  ✅ datastore '{ds_name}' 已创建")
        elif r.status_code == 500 and "already exists" in r.text:
            print(f"  ℹ️  datastore '{ds_name}' 已存在")
        else:
            print(f"  ❌ 创建 datastore 失败: {r.status_code} {r.text[:200]}")
            return False

        # 2. 直接 POST featureType 让 GeoServer 自动读 schema(不依赖 fiona)
        layer = ds["layer"]
        feat_url = (f"{self.rest}/workspaces/{WORKSPACE}/datastores/{ds_name}"
                    f"/featuretypes?configure=all")
        body = {
            "featureType": {
                "name": layer,
                "title": ds.get("title", layer),
                "abstract": ds.get("abstract", ""),
                "enabled": True,
                "srs": "EPSG:4326",  # declared SRS → WMS 自动 reproject
            }
        }
        r = requests.post(feat_url, auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 201:
            print(f"  ✅ layer '{layer}'")
            self._apply_default_style(layer, ds.get("style", "polygon"))
            return True
        if r.status_code == 500 and "already exists" in r.text:
            print(f"  ℹ️  layer '{layer}' (已存在)")
            self._apply_default_style(layer, ds.get("style", "polygon"))
            return True
        # 配置失败再检查一次
        chk = requests.get(f"{feat_url.rsplit('?', 1)[0]}/{layer}.json",
                           auth=self.auth)
        if chk.status_code == 200:
            print(f"  ℹ️  layer '{layer}' (已配置)")
            return True
        print(f"  ❌ {layer}: {r.status_code} {r.text[:300]}")
        return False

    # ---------- style ----------
    def _apply_default_style(self, layer: str, style: str):
        url = f"{self.rest}/layers/{WORKSPACE}:{layer}"
        body = {"layer": {"defaultStyle": {"name": style}}}
        r = requests.put(url, auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 200:
            print(f"    🎨 默认样式: {style}")
        else:
            # 缺样式时不强失败,只提示
            print(f"    ⚠️  应用样式 {style} 失败: HTTP {r.status_code} (用 fallback)")

    # ---------- main ----------
    def run(self):
        self.ensure_workspace()
        print()
        stats = {"total": 0, "ok": 0, "fail": 0}
        for ds in DATASETS:
            kind = ds["kind"]
            stats["total"] += 1
            print(f"\n📦 [{kind}] {ds['datastore']} → {ds['layer']}")
            ok = False
            try:
                if kind == "tif":
                    ok = self.publish_tif(ds)
                elif kind == "shp":
                    ok = self.publish_shp(ds)
            except Exception as e:
                print(f"  ❌ 异常: {e}")
                ok = False
            if ok:
                stats["ok"] += 1
            else:
                stats["fail"] += 1
            time.sleep(0.2)

        print("\n" + "=" * 70)
        print(f"发布汇总: ok={stats['ok']} / fail={stats['fail']} / total={stats['total']}")
        print(f"workspace: {WORKSPACE}")
        print(f"WMS: {GEOSERVER_URL}/{WORKSPACE}/wms")
        print("=" * 70)


if __name__ == "__main__":
    GeoServerPublisher().run()