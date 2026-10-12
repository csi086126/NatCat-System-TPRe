# -*- coding: utf-8 -*-
"""
澳门 CDROM_C 14 个土地利用原始图层上传脚本 (Infrastructure 版)
================================================================

用途
----
把 CDROM_C 下 14 个原始 .shp 图层 (boundary, centerline, doorNo, lake, lote,
monte, place, ponte, predio, rua, terra, tower, verde, xinqiao) 各自独立发布
到 GeoServer `natcat_platform` workspace,供 Risk Map 模块的 🏗️ Infrastructure
面板叠加使用。

与旧脚本 (upload_macau_lulc_to_geoserver.py) 的关键区别
-------------------------------------------------------
旧脚本在 Python 端用 pyproj 把所有 .shp 预先重投影到 EPSG:4326 后再上传,
但 .prj 写的是标准 EPSG WKT (lat/lon 轴序),与 shapefile 内部 lon/lat 存储
顺序不匹配 → GeoServer WMS 1.1.0 按 ESRI WKT 解读导致**双重轴序误差**,
最终叠加到 OSM 底图上**有可见偏移**。

新策略
------
- 上传到 GeoServer 时**保留 native CRS = ESRI:102159**
- 缺 .prj 时自动注入 MACAU_GRID_WKT (与源坐标系完全一致)
- 通过 REST API **显式设置 nativeCRS + nativeBoundingBox + latLonBoundingBox**
  (bbox 用 pyproj 把 ESRI:102159 下的 .shp 真实范围转换而来)
- WMS 渲染时由 GeoServer 内部 reproject,链路: ESRI:102159 → EPSG:4326 →
  WMS 1.1.0 (X=lon, Y=lat),与 ESRI WKT 轴序完全自洽,**不再有偏移**

不做 Composite 合并 (按用户要求)

环境变量
--------
- GEOSERVER_URL           (默认 http://localhost:8080/geoserver)
- GEOSERVER_USER          (默认 chensi)
- GEOSERVER_PASS          (必填)
- GEOSERVER_URL_REMOTE    (默认 http://143.89.22.7:8090/geoserver)
- GEOSERVER_USER_REMOTE   (默认 chensi)
- GEOSERVER_PASS_REMOTE   (必填)
- MACAU_DATA_DIR          (默认 D:\\Nat Cat Platform\\FloodData\\MO_FloodData\\
                           下墊面數據\\土地利用\\CDROM_C)
- DRY_RUN                 (true 只扫描不上传)

作者: chensi
日期: 2026-09-02
"""

from __future__ import annotations

import io
import json
import os
import shutil
import sys
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 强制 stdout UTF-8 (Windows cmd 默认 cp950)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import requests
from requests.auth import HTTPBasicAuth

# pyproj 坐标转换 (用来算 bbox)
from pyproj import Transformer, CRS

# pyshp 3.x 用 import shapefile
import shapefile  # type: ignore


# ============================================
# 配置区
# ============================================

DEFAULT_DATA_DIR = r"D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據\土地利用\CDROM_C"
DEFAULT_LOCAL_URL = "http://localhost:8080/geoserver"
DEFAULT_REMOTE_URL = "http://10.253.22.15:8080/geoserver"
WORKSPACE = "natcat_platform"

# 官方 ESRI WKT for Macau Grid (Observatorio_Meteorologico_1965_Macau_Grid, ESRI:102159)
# 直接与源 .prj 内容一致 (已在 boundary/rua/terra 三个图层的 .prj 中验证)
MACAU_GRID_WKT = (
    'PROJCS["Observatorio_Meteorologico_1965_Macau_Grid",'
    'GEOGCS["GCS_Observatorio_Meteorologico_1965",'
    'DATUM["D_Observatorio_Meteorologico_1965",'
    'SPHEROID["International_1924",6378388.0,297.0]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],'
    'PROJECTION["Transverse_Mercator"],PARAMETER["false_easting",20000.0],'
    'PARAMETER["false_northing",20000.0],'
    'PARAMETER["central_meridian",113.5364694444445],'
    'PARAMETER["scale_factor",1.0],'
    'PARAMETER["latitude_of_origin",22.21239722222222],UNIT["Meter",1.0]]'
)

# ESRI:102159 在 GeoServer 内置 SRS 库里的代码 (proj.db)
NATIVE_SRS_CODE = "EPSG:102159"


@dataclass
class LayerSpec:
    """单个原始图层的发布规格"""
    folder: str           # CDROM_C 下子目录名
    shp_name: str         # .shp 文件名 (不带扩展名) - 注意大小写敏感 (如 doorNo 必须保留 N 大写)
    geom: str             # polygon | polyline | point
    semantic: str         # 语义简述,作为 SLD title 用
    layer_name: str       # GeoServer 上的 datastore 和 layer 名
    style_color: str      # SLD 默认描边色


# 14 个原始图层注册表 (顺序按用户列出的顺序)
LAYER_REGISTRY: List[LayerSpec] = [
    LayerSpec("boundary",   "boundary",   "polyline", "Administrative boundary",  "MO_boundary",   "#E74C3C"),
    LayerSpec("centerline", "centerline", "polyline", "Street centerlines",       "MO_centerline", "#34495E"),
    LayerSpec("doorNo",     "doorNo",     "polyline", "Door numbers",              "MO_doorNo",     "#F1C40F"),
    LayerSpec("lake",       "lake",       "polygon",  "Water bodies",              "MO_lake",       "#2196F3"),
    LayerSpec("lote",       "lote",       "polygon",  "Cadastral lots",            "MO_lote",       "#D7BDE2"),
    LayerSpec("monte",      "monte",      "polygon",  "Mountains / hills",         "MO_monte",      "#8B6F47"),
    LayerSpec("place",      "place",      "point",    "Plazas / open spaces",      "MO_place",      "#F4E1A1"),
    LayerSpec("ponte",      "ponte",      "polygon",  "Bridges",                   "MO_ponte",      "#D35400"),
    LayerSpec("predio",     "predio",     "polygon",  "Buildings",                 "MO_predio",     "#A9CCE3"),
    LayerSpec("rua",        "rua",        "polygon",  "Streets (Road polygon)",    "MO_rua",        "#7F8C8D"),
    LayerSpec("terra",      "terra",      "polygon",  "Land use polygons",         "MO_terra",      "#C8C2A8"),
    LayerSpec("tower",      "tower",      "polygon",  "Towers",                    "MO_tower",      "#E67E22"),
    LayerSpec("verde",      "verde",      "polygon",  "Green spaces",              "MO_verde",      "#4CAF50"),
    # xinqiao.shp 嵌在 monte/ 子目录里
    LayerSpec("monte",      "xinqiao",    "polygon",  "Bridges (xinqiao)",         "MO_xinqiao",    "#D35400"),
]


# ============================================
# SLD 模板 (从旧脚本移植, 不依赖颜色 map)
# ============================================

POLYLINE_SLD_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>{name}</Name>
    <UserStyle>
      <Title>{title}</Title>
      <FeatureTypeStyle>
        <Rule>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">{color}</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""

POLYGON_SLD_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>{name}</Name>
    <UserStyle>
      <Title>{title}</Title>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">{color}</CssParameter>
              <CssParameter name="fill-opacity">0.35</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">{color}</CssParameter>
              <CssParameter name="stroke-width">0.6</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""

POINT_SLD_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>{name}</Name>
    <UserStyle>
      <Title>{title}</Title>
      <FeatureTypeStyle>
        <Rule>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">{color}</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>6</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""


# ============================================
# GeoServer REST 客���端
# ============================================

class GeoServerClient:
    """封装 GeoServer REST API, 只用最少的端点"""

    def __init__(self, base_url: str, user: str, password: str):
        self.base = base_url.rstrip("/")
        self.rest = f"{self.base}/rest"
        self.auth = HTTPBasicAuth(user, password)
        self.headers_xml = {"Content-Type": "application/xml; charset=utf-8"}

    def ping(self) -> bool:
        try:
            r = requests.get(f"{self.rest}/about/status", auth=self.auth, timeout=10)
            ok = r.status_code == 200
            print(f"  [PING] {self.base} -> {r.status_code} {'OK' if ok else 'FAIL'}")
            return ok
        except Exception as e:
            print(f"  [PING] {self.base} -> ERROR: {e}")
            return False

    def create_workspace(self, ws: str) -> bool:
        """如果 workspace 不存在则创建"""
        r = requests.get(f"{self.rest}/workspaces/{ws}.json", auth=self.auth, timeout=10)
        if r.status_code == 200:
            print(f"  [OK] workspace '{ws}' 已存在")
            return True
        body = f"<workspace><name>{ws}</name></workspace>"
        r = requests.post(f"{self.rest}/workspaces", auth=self.auth,
                          headers=self.headers_xml, data=body.encode("utf-8"), timeout=10)
        if r.status_code in (200, 201):
            print(f"  [OK] workspace '{ws}' 创建成功")
            return True
        print(f"  [FAIL] workspace 创建失败: {r.status_code} {r.text[:200]}")
        return False

    def delete_datastore(self, ws: str, store: str) -> None:
        """彻底删除 (用于重传)。先 HEAD 检查是否存在, 不存在则跳过避免超时"""
        try:
            r = requests.get(
                f"{self.rest}/workspaces/{ws}/datastores/{store}.json",
                auth=self.auth, timeout=15,
            )
            if r.status_code == 404:
                print(f"  [CLEAN] datastore '{store}' 不存在, 跳过")
                return
        except requests.exceptions.RequestException as e:
            print(f"  [WARN] 检查 datastore '{store}' 失败: {e}, 继续尝试 DELETE")
        try:
            r = requests.delete(
                f"{self.rest}/workspaces/{ws}/datastores/{store}.json?recurse=true",
                auth=self.auth, timeout=60,
            )
            if r.status_code in (200, 404):
                print(f"  [CLEAN] datastore '{store}' 清理 status={r.status_code}")
            else:
                print(f"  [WARN] datastore '{store}' 清理失败 status={r.status_code}: {r.text[:200]}")
        except requests.exceptions.RequestException as e:
            print(f"  [WARN] DELETE datastore '{store}' 超时/错误: {e}, 继续尝试上传")

    def upload_shapefile_zip(self, ws: str, store: str, zip_path: Path) -> bool:
        """file.shp PUT — GeoServer 解压 ZIP 后配置 featuretype"""
        url = f"{self.rest}/workspaces/{ws}/datastores/{store}/file.shp"
        with open(zip_path, "rb") as f:
            data = f.read()
        r = requests.put(
            url, auth=self.auth,
            params={"configure": "all", "update": "overwrite"},
            headers={"Content-Type": "application/zip"},
            data=data, timeout=600,
        )
        if r.status_code in (200, 201):
            print(f"  [OK] datastore '{store}' 上传成功 ({len(data)/1024:.1f} KB)")
            return True
        print(f"  [FAIL] 上传失败 status={r.status_code}: {r.text[:300]}")
        return False

    def configure_featuretype_declared_srs(
        self, ws: str, store: str, ft_name: str,
        native_bbox: Dict[str, float], latlon_bbox: Dict[str, float],
    ) -> bool:
        """PUT featuretype.json 显式设置 srs + bbox (这是修复偏移的关键!)

        GeoServer 默认会把 shapefile 内部坐标当作 declared SRS 处理; 如果不显式
        设置 srs=EPSG:4326, 前端请求 srs=EPSG:3857 时 GeoServer 不会触发
        reprojection, 直接把 ESRI:102159 的米坐标当 3857 米坐标输出 → 偏移 1000 倍。

        注: 不能同时设置 nativeCRS 字段 (GeoServer 2.27 触发 NPE bug:
        "Cannot invoke MetadataMap.get(Object) because getMetadata() is null")
        """
        url = f"{self.rest}/workspaces/{ws}/datastores/{store}/featuretypes/{ft_name}.json"
        body = {
            "featureType": {
                "name": ft_name,
                "srs": "EPSG:4326",
                "nativeBoundingBox": {
                    "minx": native_bbox["minx"],
                    "maxx": native_bbox["maxx"],
                    "miny": native_bbox["miny"],
                    "maxy": native_bbox["maxy"],
                    "crs": NATIVE_SRS_CODE,
                },
                "latLonBoundingBox": {
                    "minx": latlon_bbox["minx"],
                    "maxx": latlon_bbox["maxx"],
                    "miny": latlon_bbox["miny"],
                    "maxy": latlon_bbox["maxy"],
                    "crs": "EPSG:4326",
                },
            }
        }
        r = requests.put(url, auth=self.auth, json=body, timeout=60)
        if r.status_code in (200, 201):
            print(f"  [OK] featuretype '{ft_name}' srs+bbox 已设置 (declared=EPSG:4326)")
            return True
        print(f"  [WARN] featuretype srs 配置 status={r.status_code}: {r.text[:200]}")
        return False

    def apply_style(self, ws: str, layer: str, sld_body: str) -> bool:
        style_name = f"{layer}_style"
        # 1) 创建 style descriptor
        descriptor = (
            f"<style><name>{style_name}</name>"
            f"<filename>{style_name}.sld</filename></style>"
        )
        r = requests.post(
            f"{self.rest}/styles", auth=self.auth,
            headers=self.headers_xml,
            data=descriptor.encode("utf-8"), timeout=60,
        )
        ok_codes = {200, 201, 409}
        if r.status_code == 500 and "already exists" in r.text:
            pass
        elif r.status_code not in ok_codes:
            print(f"    [WARN] POST style descriptor 失败 status={r.status_code}: {r.text[:200]}")
            return False
        # 2) PUT SLD body
        r = requests.put(
            f"{self.rest}/styles/{style_name}", auth=self.auth,
            params={"raw": "true"},
            headers={"Content-Type": "application/vnd.ogc.se+xml"},
            data=sld_body.encode("utf-8"), timeout=60,
        )
        if r.status_code not in (200, 201):
            print(f"    [WARN] PUT SLD body 失败 status={r.status_code}: {r.text[:200]}")
            return False
        # 3) 绑定为 layer 的 default style
        r = requests.put(
            f"{self.rest}/layers/{ws}:{layer}", auth=self.auth, json={
                "layer": {"defaultStyle": {"name": style_name}}
            }, timeout=60,
        )
        if r.status_code not in (200, 201):
            print(f"    [WARN] 绑定 style 失败 status={r.status_code}: {r.text[:200]}")
            return False
        print(f"  [OK] style '{style_name}' 绑定完成")
        return True


# ============================================
# 工具函数
# ============================================

def read_bbox_in_native_crs(shp_path: Path) -> Tuple[float, float, float, float]:
    """读取 .shp 的真实 bbox (源坐标系下, 单位米)
    返回 (minx, miny, maxx, maxy)
    """
    r = shapefile.Reader(str(shp_path))
    if not r.shapes():
        raise ValueError(f"{shp_path} 没有 shapes")
    xs, ys = [], []
    for shp in r.shapes():
        for pt in shp.points:
            xs.append(pt[0])
            ys.append(pt[1])
    return (min(xs), min(ys), max(xs), max(ys))


def transform_bbox(
    bbox_native: Tuple[float, float, float, float]
) -> Tuple[Dict[str, float], Dict[str, float]]:
    """bbox 从 native (ESRI:102159, meters) 转到 EPSG:4326 (degrees)
    返回 (native_bbox_dict, latlon_bbox_dict)

    注: pyproj 内置 proj.db 不包含 EPSG:102159, 用 ESRI WKT 直接构造 CRS。
    """
    minx, miny, maxx, maxy = bbox_native
    transformer = Transformer.from_crs(
        CRS.from_wkt(MACAU_GRID_WKT),
        CRS.from_epsg(4326),
        always_xy=True,  # 输出 (lon, lat)
    )
    # 转换 4 个角 + 中点, 取并集确保覆盖完整 bbox
    corners_native = [
        (minx, miny), (maxx, miny), (minx, maxy), (maxx, maxy),
        ((minx + maxx) / 2, (miny + maxy) / 2),
    ]
    lons, lats = [], []
    for x, y in corners_native:
        lon, lat = transformer.transform(x, y)
        lons.append(lon)
        lats.append(lat)
    native_bbox = {
        "minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy,
    }
    latlon_bbox = {
        "minx": min(lons), "miny": min(lats),
        "maxx": max(lons), "maxy": max(lats),
    }
    return native_bbox, latlon_bbox


def build_upload_zip(
    src_folder: Path, shp_name: str, layer_name: str, out_zip: Path,
) -> None:
    """打包 .shp/.shx/.dbf/.prj/.cpg 成 zip
    缺 .prj 时注入 MACAU_GRID_WKT (与源坐标系完全一致)

    关键: zip 内文件名必须用 layer_name (如 MO_boundary.shp), 让 GeoServer
    自动注册的 layer 名 = layer_name, 而不是 shp_name.
    """
    out_zip.parent.mkdir(parents=True, exist_ok=True)
    extensions = [".shp", ".shx", ".dbf"]
    optional = [".prj", ".cpg", ".sbn", ".sbx", ".xml"]

    sources: Dict[str, bytes] = {}
    for ext in extensions:
        f = src_folder / f"{shp_name}{ext}"
        if not f.exists():
            raise FileNotFoundError(f"{f} 缺失")
        sources[f"{layer_name}{ext}"] = f.read_bytes()
    for ext in optional:
        f = src_folder / f"{shp_name}{ext}"
        if f.exists():
            sources[f"{layer_name}{ext}"] = f.read_bytes()

    if f"{layer_name}.prj" not in sources:
        sources[f"{layer_name}.prj"] = MACAU_GRID_WKT.encode("ascii")
        print(f"    [INFO] 注入 .prj (ESRI:102159 WKT)")

    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in sources.items():
            zf.writestr(name, data)


def build_sld(spec: LayerSpec) -> str:
    if spec.geom == "polygon":
        return POLYGON_SLD_TEMPLATE.format(
            name=spec.layer_name, title=spec.semantic, color=spec.style_color)
    elif spec.geom == "polyline":
        return POLYLINE_SLD_TEMPLATE.format(
            name=spec.layer_name, title=spec.semantic, color=spec.style_color)
    else:  # point
        return POINT_SLD_TEMPLATE.format(
            name=spec.layer_name, title=spec.semantic, color=spec.style_color)


def upload_one_layer(
    client: GeoServerClient,
    spec: LayerSpec,
    data_dir: Path,
    work_dir: Path,
    dry_run: bool,
) -> str:
    """上传单个图层到指定 GeoServer。返回 'ok' / 'fail:xxx'"""
    src_folder = data_dir / spec.folder
    shp = src_folder / f"{spec.shp_name}.shp"
    if not src_folder.exists() or not shp.exists():
        return "skip-missing-source"

    print(f"\n→ {spec.layer_name} ({spec.geom}, {spec.semantic})")
    print(f"   source: {shp}")

    if dry_run:
        return "dry-run"

    # 1. 清理旧 datastore (recurse=true 会同步删除 layer)
    client.delete_datastore(WORKSPACE, spec.layer_name)
    time.sleep(0.5)

    # 2. 打包 zip (含补 .prj, zip 内文件名 = layer_name)
    zip_path = work_dir / f"{spec.layer_name}.zip"
    try:
        build_upload_zip(src_folder, spec.shp_name, spec.layer_name, zip_path)
    except Exception as e:
        print(f"  [FAIL] 打包失败: {e}")
        return f"fail-zip:{e}"

    # 3. 上传 shapefile (configure=all 自动注册 featuretype + layer)
    if not client.upload_shapefile_zip(WORKSPACE, spec.layer_name, zip_path):
        return "fail-upload"

    time.sleep(0.5)

    # 4. GeoServer Shapefile datastore 自动扫描目录下所有 .shp 注册为 featuretype,
    #    旧残留文件 (例如 *_wgs84.shp) 会被一起注册。需要清理这些残留 featuretype
    #    和对应的 layer, 避免污染 WMS capabilities.
    try:
        cleanup_stale_featuretypes(client, WORKSPACE, spec.layer_name, expected=spec.layer_name)
    except Exception as e:
        print(f"  [WARN] 清理残留 featuretype 失败: {e}")

    # 5. 关键修复: 显式设置 declared srs=EPSG:4326 + nativeBoundingBox + latLonBoundingBox
    #    这是修复偏移的核心步骤。不显式设置时, GeoServer 会用 declared srs=None
    #    直接把 shapefile 内部 ESRI:102159 米坐标当目标 SRS 输出 → 严重偏移。
    try:
        bbox_native = read_bbox_in_native_crs(shp)
        nat, ll = transform_bbox(bbox_native)
        pad = 50.0
        nat["minx"] -= pad; nat["miny"] -= pad
        nat["maxx"] += pad; nat["maxy"] += pad
        client.configure_featuretype_declared_srs(
            WORKSPACE, spec.layer_name, spec.layer_name, nat, ll
        )
    except Exception as e:
        print(f"  [WARN] srs/bbox 设置失败: {e}")

    # 6. 触发 reload 让 WMS capabilities 立即生效
    try:
        requests.post(f"{client.rest}/reload", auth=client.auth, timeout=10)
    except Exception:
        pass

    # 7. 上传并绑定 SLD
    sld = build_sld(spec)
    if not client.apply_style(WORKSPACE, spec.layer_name, sld):
        return "fail-style"

    return "ok"


def cleanup_stale_featuretypes(
    client: GeoServerClient, ws: str, store: str, expected: str,
) -> None:
    """清理 datastore 下非期望的 featuretype (例如旧脚本残留的 *_wgs84)"""
    r = requests.get(
        f"{client.rest}/workspaces/{ws}/datastores/{store}/featuretypes.json",
        auth=client.auth, timeout=10,
    )
    if r.status_code != 200:
        return
    for ft in r.json().get("featureTypes", {}).get("featureType", []):
        ft_name = ft["name"]
        if ft_name == expected:
            continue
        # 删除对应 layer + featuretype
        requests.delete(
            f"{client.rest}/workspaces/{ws}/layers/{ft_name}.json?recurse=true",
            auth=client.auth, timeout=10,
        )
        requests.delete(
            f"{client.rest}/workspaces/{ws}/datastores/{store}/featuretypes/{ft_name}.json?recurse=true",
            auth=client.auth, timeout=10,
        )
        print(f"  [CLEAN] 残留 featuretype '{ft_name}' 已清理")


def upload_all(
    name: str, url: str, user: str, password: str,
    data_dir: Path, work_dir: Path, dry_run: bool,
) -> Dict[str, str]:
    print(f"\n{'=' * 70}")
    print(f"[{name}] GeoServer = {url} (user={user})")
    print(f"{'=' * 70}")

    client = GeoServerClient(url, user, password)
    if not dry_run:
        if not client.ping():
            print(f"[ABORT] {name} GeoServer 不可达")
            return {}
        if not client.create_workspace(WORKSPACE):
            return {}

    stats: Dict[str, str] = {}
    for spec in LAYER_REGISTRY:
        stats[spec.layer_name] = upload_one_layer(client, spec, data_dir, work_dir, dry_run)
    return stats


# ============================================
# 入口
# ============================================

def main() -> int:
    data_dir = Path(os.getenv("MACAU_DATA_DIR", DEFAULT_DATA_DIR))
    dry_run = os.getenv("DRY_RUN", "false").lower() in ("1", "true", "yes")

    local_url = os.getenv("GEOSERVER_URL", DEFAULT_LOCAL_URL)
    local_user = os.getenv("GEOSERVER_USER", "chensi")
    local_pass = os.getenv("GEOSERVER_PASS", "")

    remote_url = os.getenv("GEOSERVER_URL_REMOTE", DEFAULT_REMOTE_URL)
    remote_user = os.getenv("GEOSERVER_USER_REMOTE", "chensi")
    remote_pass = os.getenv("GEOSERVER_PASS_REMOTE", "")

    print("=" * 70)
    print("澳门 Infrastructure (CDROM_C) 14 图层上传脚本")
    print("=" * 70)
    print(f"Data dir:      {data_dir}")
    print(f"DRY_RUN:       {dry_run}")
    print(f"Local GS:      {local_url} ({local_user})")
    print(f"Remote GS:     {remote_url} ({remote_user})")
    print()

    if not dry_run and not local_pass:
        print("[ERROR] 未设置 GEOSERVER_PASS (本地凭据必填)")
        return 1
    if not dry_run and not remote_pass:
        print("[ERROR] 未设置 GEOSERVER_PASS_REMOTE (远程凭据必填)")
        return 1
    if not data_dir.exists():
        print(f"[ERROR] 数据目录不存在: {data_dir}")
        return 1

    work_dir = data_dir / "_uploads"
    if work_dir.exists() and not dry_run:
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

    all_stats: Dict[str, Dict[str, str]] = {}
    skip_local = os.getenv("SKIP_LOCAL", "false").lower() in ("1", "true", "yes")
    skip_remote = os.getenv("SKIP_REMOTE", "false").lower() in ("1", "true", "yes")

    # ---- 本地 ----
    if not skip_local:
        all_stats["local"] = upload_all(
            "LOCAL", local_url, local_user, local_pass,
            data_dir, work_dir, dry_run,
        )
    else:
        print("[SKIP_LOCAL] 跳过本地 GeoServer")
        all_stats["local"] = {}

    # ---- 远程 ----
    if not skip_remote:
        all_stats["remote"] = upload_all(
            "REMOTE", remote_url, remote_user, remote_pass,
            data_dir, work_dir, dry_run,
        )
    else:
        print("[SKIP_REMOTE] 跳过远程 GeoServer")
        all_stats["remote"] = {}

    # ---- 汇总 ----
    print("\n" + "=" * 70)
    print("[SUMMARY]")
    print("=" * 70)
    for env_name, stats in all_stats.items():
        if not stats:
            print(f"  {env_name}: (no runs)")
            continue
        ok = sum(1 for v in stats.values() if v == "ok")
        fail = sum(1 for v in stats.values() if v.startswith("fail"))
        skip = sum(1 for v in stats.values() if v.startswith("skip"))
        print(f"  {env_name}: ok={ok}  fail={fail}  skip={skip}")
        for layer, status in stats.items():
            marker = "✓" if status == "ok" else ("·" if status.startswith("skip") else "✗")
            print(f"    {marker} {layer}: {status}")

    return 0


if __name__ == "__main__":
    sys.exit(main())