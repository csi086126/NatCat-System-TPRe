"""
把 D:/HK-MO-Deliverable/HK/Advertising 下的 HK 数据接入 GeoServer。

输入目录(只处理可发布的空间数据):
  building/building.shp         → datastore: HK_Building_Shapefile
                                   layer:     HK_Building

  road/Road.gdb                 → datastore: HK_Road_GDB
                                   layers:    CENTERLINE, TURN, INTERSECTION,
                                              ROUNDABOUT, TRAFFIC_FEATURES,
                                              RUN_IN_OUT, NSR, PEDESTRIAN_ZONE,
                                              BUS_ONLY_LANE, SPEED_LIMIT,
                                              PROHIBITION, VEHICLE_RESTRICTION,
                                              PERMIT, ONSTREETPARK,
                                              GISP_ON_STREET_PARKING,
                                              TUN_BRIDGE_TOLL, TUN_BRIDGE_TV_TOLL

  underlying/DEM_5m.tif         → datastore: HK_DEM_5m          layer: HK_DEM_5m
  underlying/LULC_DynamicWorld.tif → datastore: HK_LULC_DynamicWorld  layer: HK_LULC_DynamicWorld
  underlying/SOIL_OpenLandMap.tif  → datastore: HK_SOIL_OpenLandMap    layer: HK_SOIL_OpenLandMap

跳过 drainage_river/HK_tunnel_tank.inp(SWMM 模型,非空间数据)。

workspace 复用现有 natcat_platform(已有 HongKong_* / HK_Flood_* 等图层)。

运行:
  python scripts/publish-hk-advertising-data.py
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

# 用 fiona 读取 schema,避免依赖 ogr2ogr
try:
    import fiona
    from fiona import collection as fiona_collection
    FIONA_OK = True
except Exception:
    FIONA_OK = False

# 加载项目根 .env
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://localhost:8080/geoserver").rstrip("/")
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "chensi")
GEOSERVER_PASS = os.getenv("GEOSERVER_PASS", "")
WORKSPACE = "natcat_platform"

AD_ROOT = Path(r"D:/HK-MO-Deliverable/HK/Advertising")

# 各数据集 → datastore 配置
DATASETS: List[Dict] = [
    # TIF coverages
    {
        "kind": "tif",
        "datastore": "HK_DEM_5m",
        "tif_path": AD_ROOT / "underlying" / "DEM_5m.tif",
        "layer": "HK_DEM_5m",
        "title": "Hong Kong DEM (5m)",
        "abstract": "Hong Kong 5m resolution DEM",
        "style": "dem_terrain",
    },
    {
        "kind": "tif",
        "datastore": "HK_LULC_DynamicWorld",
        "tif_path": AD_ROOT / "underlying" / "LULC_DynamicWorld.tif",
        "layer": "HK_LULC_DynamicWorld",
        "title": "Hong Kong LULC (DynamicWorld)",
        "abstract": "DynamicWorld land use / land cover for Hong Kong",
        "style": "lulc_dynamicworld",
    },
    {
        "kind": "tif",
        "datastore": "HK_SOIL_OpenLandMap",
        "tif_path": AD_ROOT / "underlying" / "SOIL_OpenLandMap.tif",
        "layer": "HK_SOIL_OpenLandMap",
        "title": "Hong Kong Soil (OpenLandMap)",
        "abstract": "OpenLandMap soil texture for Hong Kong",
        "style": "soil_openlandmap",
    },
    # Building shapefile
    {
        "kind": "shp",
        "datastore": "HK_Building_Shapefile",
        "shp_path": AD_ROOT / "building" / "building.shp",
        "layer": "HK_Building",
        "title": "Hong Kong Buildings",
        "abstract": "Hong Kong building footprints",
        "style": "polygon",
    },
    # Road GDB — 17 layers
    {
        "kind": "gdb",
        "datastore": "HK_Road_GDB",
        "gdb_path": AD_ROOT / "road" / "Road.gdb",
        # 17 个子图层,全部发布
        "layers": [
            "CENTERLINE",
            "TURN",
            "INTERSECTION",
            "ROUNDABOUT",
            "TRAFFIC_FEATURES",
            "RUN_IN_OUT",
            "NSR",
            "PEDESTRIAN_ZONE",
            "BUS_ONLY_LANE",
            "SPEED_LIMIT",
            "PROHIBITION",
            "VEHICLE_RESTRICTION",
            "PERMIT",
            "ONSTREETPARK",
            "GISP_ON_STREET_PARKING",
            "TUN_BRIDGE_TOLL",
            "TUN_BRIDGE_TV_TOLL",
        ],
        "title_prefix": "Hong Kong Road ",
        "style": "line",
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
        print(f"✅ 已连接 GeoServer {self.base} (v{ver})")

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
    def publish_tif(self, ds: Dict):
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

        # 默认样式
        self._apply_default_style(layer, ds.get("style", "raster"))
        return True

    # ---------- Shapefile ----------
    def publish_shp(self, ds: Dict):
        ds_name = ds["datastore"]
        shp = ds["shp_path"]
        if not shp.exists():
            print(f"  ❌ 文件不存在: {shp}")
            return False
        shp_dir = shp.parent
        for ext in (".shp", ".dbf", ".shx", ".prj"):
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

        # 2. 通过 fiona 读 schema,再 POST 完整 featureType
        layer = ds["layer"]
        schema = self._read_schema_shp(shp)
        if not schema:
            return False
        ok = self._post_feature_type(ds_name, layer,
                                      title=ds.get("title", layer),
                                      attributes=schema,
                                      style=ds.get("style", "polygon"))
        return ok

    def _read_schema_shp(self, shp_path: Path) -> List[Dict]:
        """用 fiona 读取 shapefile 的字段定义。"""
        if not FIONA_OK:
            print("  ❌ 需要 fiona 但未安装")
            return []
        try:
            with fiona.open(str(shp_path)) as src:
                schema = []
                # 几何字段
                geom_type = src.schema.get("geometry", "Unknown")
                schema.append({
                    "name": self._geom_field_name(src),
                    "binding": self._geom_binding(geom_type),
                })
                # 属性字段
                type_map = {
                    "int": "java.lang.Integer",
                    "int32": "java.lang.Integer",
                    "int64": "java.lang.Long",
                    "float": "java.lang.Double",
                    "float32": "java.lang.Float",
                    "float64": "java.lang.Double",
                    "str": "java.lang.String",
                    "date": "java.util.Date",
                    "time": "java.util.Date",
                    "datetime": "java.util.Date",
                }
                for name, fmt in src.schema["properties"].items():
                    # fiona 类型字符串形如 'float:24.15' / 'str:80'
                    base = fmt.split(":")[0]
                    binding = type_map.get(base, "java.lang.String")
                    schema.append({"name": name, "binding": binding})
                return schema
        except Exception as e:
            print(f"  ❌ 读 shapefile schema 失败: {e}")
            return []

    def _geom_field_name(self, src) -> str:
        # 找 geometry 字段名
        for k, v in src.schema.items():
            if k == "geometry":
                # fiona 的 schema 通常 {"geometry": "...", "properties": {...}}
                # 实际字段名固定为 'geometry'
                return "geometry"
        return "the_geom"

    def _geom_binding(self, gtype: str) -> str:
        # fiona 返回 'Polygon' / 'MultiPolygon' / 'LineString' 等
        m = {
            "Point": "com.vividsolutions.jts.geom.Point",
            "MultiPoint": "com.vividsolutions.jts.geom.MultiPoint",
            "LineString": "com.vividsolutions.jts.geom.LineString",
            "MultiLineString": "com.vividsolutions.jts.geom.MultiLineString",
            "Polygon": "com.vividsolutions.jts.geom.Polygon",
            "MultiPolygon": "com.vividsolutions.jts.geom.MultiPolygon",
        }
        return m.get(gtype, "com.vividsolutions.jts.geom.Geometry")

    # ---------- File Geodatabase ----------
    def publish_gdb(self, ds: Dict):
        ds_name = ds["datastore"]
        gdb = ds["gdb_path"]
        if not gdb.exists():
            print(f"  ❌ 目录不存在: {gdb}")
            return False
        file_url = "file:///" + str(gdb).replace("\\", "/")
        body = {
            "dataStore": {
                "name": ds_name,
                "type": "FileGDB",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "connectionParameters": {
                    "entry": [
                        {"@key": "url", "$": file_url},
                        {"@key": "namespace", "$": WORKSPACE},
                        {"@key": "dbtype", "$": "FileGDB"},
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

        # 列出 datastore 实际 schema 中的图层名
        avail = self._list_gdb_layers(ds_name)
        if not avail:
            print(f"  ⚠️  无法读取 GDB 图层列表,将尝试配置全部 17 个目标层")
        requested = set(ds["layers"])
        publishable = [l for l in requested if l in avail] if avail else list(requested)
        missing = requested - set(publishable)

        success = 0
        for layer in publishable:
            ok = self._publish_gdb_layer(ds_name, layer,
                                          title=ds["title_prefix"] + layer,
                                          style=ds.get("style", "line"))
            if ok:
                success += 1
            time.sleep(0.2)
        print(f"  ✅ {ds_name}: {success}/{len(publishable)} 层已发布"
              + (f" (目标缺:{sorted(missing)})" if missing else ""))
        return True

    def _list_gdb_layers(self, ds_name: str) -> set:
        """列出 datastore 内的所有 featuretype 名字(已发布 + 未发布)。"""
        names = set()
        try:
            r = requests.get(f"{self.rest}/workspaces/{WORKSPACE}"
                             f"/datastores/{ds_name}/featuretypes.json?list=available",
                             auth=self.auth, timeout=10)
            if r.status_code == 200:
                data = r.json()
                # available=true 返回纯名字列表;available=all 才有 full objects
                # ?list=available -> {"list": "available", "featureTypeNames": ["a","b"]}
                ft_names = data.get("featureTypeNames") or data.get("featureTypes") or []
                if isinstance(ft_names, list):
                    if ft_names and isinstance(ft_names[0], dict):
                        names = {f.get("name") for f in ft_names}
                    else:
                        names = set(ft_names)
        except Exception as e:
            print(f"  ⚠️  列 GDB 图层失败: {e}")
        return names

    def _publish_gdb_layer(self, ds_name: str, layer: str,
                           title: str, style: str) -> bool:
        feat_url = (f"{self.rest}/workspaces/{WORKSPACE}/datastores/{ds_name}"
                    f"/featuretypes?configure=all")
        body = {
            "featureType": {
                "name": layer,
                "title": title,
                "enabled": True,
            }
        }
        r = requests.post(feat_url, auth=self.auth, json=body, headers=self.headers)
        if r.status_code == 201:
            print(f"    ✅ {layer}")
            self._apply_default_style(layer, style)
            return True
        if r.status_code == 500 and "already exists" in r.text:
            print(f"    ℹ️  {layer} (已存在)")
            self._apply_default_style(layer, style)
            return True
        # 配置失败再检查一次
        chk = requests.get(f"{feat_url.rsplit('?', 1)[0]}/{layer}.json",
                           auth=self.auth)
        if chk.status_code == 200:
            print(f"    ℹ️  {layer} (已配置)")
            return True
        print(f"    ❌ {layer}: {r.status_code} {r.text[:160]}")
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
            print(f"\n📦 [{kind}] {ds['datastore']}")
            ok = False
            try:
                if kind == "tif":
                    ok = self.publish_tif(ds)
                elif kind == "shp":
                    ok = self.publish_shp(ds)
                elif kind == "gdb":
                    ok = self.publish_gdb(ds)
            except Exception as e:
                print(f"  ❌ 异常: {e}")
                ok = False
            if ok:
                stats["ok"] += 1
            else:
                stats["fail"] += 1

        print("\n" + "=" * 70)
        print(f"发布汇总: ok={stats['ok']} / fail={stats['fail']} / total={stats['total']}")
        print(f"workspace: {WORKSPACE}")
        print(f"WMS: {GEOSERVER_URL}/{WORKSPACE}/wms")
        print("=" * 70)


if __name__ == "__main__":
    GeoServerPublisher().run()
