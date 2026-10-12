# -*- coding: utf-8 -*-
"""
澳门土地利用 (LULC) Shapefile 上传脚本
=====================================

目标:
1. 把 CDROM_C 下 14 个原始子图层 (.shp) 各自独立发布到 GeoServer
   workspace = `natcat_platform` (与 HK_LULC / MO_Flood_Design_* 保持一致)
2. 把语义相近的 Polygon 层 (terra / verde / monte / lake) 合并为一个
   综合图层 `MO_LandUse_Composite`,作为 Risk Map 的一键 LULC 底图

每个图层发布后:
- 原始明细层保留澳门网格坐标系,缺少 .prj 时在上传包中补入官方 CRS
- 综合层转换为 WGS84 (EPSG:4326)
- 自动创建 datastore + featuretype (configure=all)
- 应用基础样式 (polygon = transparent fill + 分类描边, polyline/point = 描边/符号)

前置依赖:
    pip install pyshp pyproj requests python-dotenv

环境变量:
    GEOSERVER_URL      (默认 http://localhost:8080/geoserver)
    GEOSERVER_USER     (默认 chensi)
    GEOSERVER_PASS     (无��认,必填)
    MACAU_LULC_DIR     (默认 D:\\Nat Cat Platform\\FloodData\\MO_FloodData\\下墊面數據\\下墊面數據For_TAIPINGRE\\土地利用\\CDROM_C)
    DRY_RUN            (true 只扫描不上传)

作者: chensi
日期: 2026-09-02
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
import zipfile

# 强制 stdout 使用 UTF-8 (Windows cmd 默认 cp950 会让中文 print 报错)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
from requests.auth import HTTPBasicAuth

# ============================================
# 配置区
# ============================================

DEFAULT_GEOSERVER_URL = "http://localhost:8080/geoserver"
DEFAULT_LULC_DIR = r"D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據\下墊面數據For_TAIPINGRE\土地利用\CDROM_C"
WORKSPACE = "natcat_platform"

# Composite 由哪些原始层构成 (仅 Polygon,语义相近)
# 注意: place.shp 实际是 Point 类型,已排除
COMPOSITE_MEMBERS: Tuple[str, ...] = ("terra", "verde", "monte", "lake")
COMPOSITE_CLASS_MAP: Dict[str, str] = {
    "terra":  "Bare / Settlement",
    "verde":  "Vegetation",
    "monte":  "Mountain",
    "lake":   "Water",
}
COMPOSITE_COLOR_MAP: Dict[str, str] = {
    "Bare / Settlement":   "#C8C2A8",  # 灰褐
    "Vegetation":          "#4CAF50",  # 绿
    "Mountain":            "#8B6F47",  # 棕
    "Water":               "#2196F3",  # 蓝
    "Plaza / Open Space":  "#F4E1A1",  # 浅黄
}

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
WGS84_WKT = (
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
    'SPHEROID["WGS_1984",6378137.0,298.257223563]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
)


@dataclass
class LayerSpec:
    """单个原始图层的发布规格"""
    folder: str                 # CDROM_C 下子目录名 (默认 == .shp 名)
    geom: str                   # polygon | polyline | point
    semantic: str               # 语义简述,作为 SLD title 用
    layer_name: str             # 在 GeoServer 上的 layer name
    default_sld: Optional[str] = None  # 可选 SLD XML 内容
    # 若 .shp 名�� folder 不同 (例如嵌在别的子目录里),指定 shp_name
    shp_name: Optional[str] = None


# 14 个原始图层注册表
LAYER_REGISTRY: List[LayerSpec] = [
    # 几何类型按 CDROM 官方文档 (Shp_Info.htm) 修正:
    #   Boundary=Line, Centerline=Line, DoorNo=Line, Place=Point, Ponte=Polygon, Rua=Polygon
    LayerSpec("boundary",   "polyline", "Administrative boundary",   "MO_boundary"),
    LayerSpec("centerline", "polyline", "Street centerlines",        "MO_centerline"),
    LayerSpec("doorNo",     "polyline", "Door numbers",               "MO_doorNo"),
    LayerSpec("lake",       "polygon",  "Water bodies",               "MO_lake"),
    LayerSpec("lote",       "polygon",  "Cadastral lots",             "MO_lote"),
    LayerSpec("monte",      "polygon",  "Mountains / hills",          "MO_monte"),
    LayerSpec("place",      "point",    "Plazas / open spaces",       "MO_place"),
    LayerSpec("ponte",      "polygon",  "Bridges",                    "MO_ponte"),
    LayerSpec("predio",     "polygon",  "Buildings",                  "MO_predio"),
    LayerSpec("rua",        "polygon",  "Streets (Road polygon)",     "MO_rua"),
    LayerSpec("terra",      "polygon",  "Land use polygons",          "MO_terra"),
    LayerSpec("tower",      "polygon",  "Towers",                     "MO_tower"),
    LayerSpec("verde",      "polygon",  "Green spaces",               "MO_verde"),
    # xinqiao.shp 嵌在 monte/ 子目录里,实际几何是 Polygon
    LayerSpec(folder="monte", geom="polygon", semantic="Bridges (xinqiao)",
              layer_name="MO_xinqiao", shp_name="xinqiao"),
]

# Composite 在 GeoServer 上的图层名
COMPOSITE_LAYER_NAME = "MO_LandUse_Composite"


# ============================================
# 基础 SLD (按几何类型分)
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
              <CssParameter name="stroke-width">1.5</CssParameter>
            </Stroke>
          </LineSymbolizer>
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
                  <CssParameter name="stroke">#ffffff</CssParameter>
                  <CssParameter name="stroke-width">0.8</CssParameter>
                </Stroke>
              </Mark>
              <Size>5</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""


def _color_for_semantic(semantic: str) -> str:
    """按语义返回默认描边色"""
    m = {
        "Administrative boundary":  "#E74C3C",
        "Street centerlines":      "#34495E",
        "Door numbers":            "#9B59B6",
        "Water bodies":            "#2196F3",
        "Cadastral lots":          "#7F8C8D",
        "Mountains / hills":       "#8B6F47",
        "Plazas / open spaces":    "#F4E1A1",
        "Bridges":                 "#E67E22",
        "Buildings":               "#4A90E2",
        "Streets":                 "#2C3E50",
        "Land use polygons":       "#16A085",
        "Towers":                  "#C0392B",
        "Green spaces":            "#27AE60",
        "Bridges (xinqiao)":       "#D35400",
    }
    return m.get(semantic, "#666666")


def build_polygon_sld(name: str, title: str, fill: str, stroke: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
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
              <CssParameter name="fill">{fill}</CssParameter>
              <CssParameter name="fill-opacity">0.35</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">{stroke}</CssParameter>
              <CssParameter name="stroke-width">0.6</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""


def build_composite_sld(name: str, title: str) -> str:
    """MO_LandUse_Composite 按 lulc_cls 分类着色。"""
    rules = []
    for cls, color in COMPOSITE_COLOR_MAP.items():
        rules.append(f"""        <Rule>
          <Name>{cls}</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>lulc_cls</ogc:PropertyName>
              <ogc:Literal>{cls}</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">{color}</CssParameter>
              <CssParameter name="fill-opacity">0.55</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">{color}</CssParameter>
              <CssParameter name="stroke-width">0.4</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>""")
    rules_xml = "\n".join(rules)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>{name}</Name>
    <UserStyle>
      <Title>{title}</Title>
      <FeatureTypeStyle>
{rules_xml}
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
"""


# ============================================
# GeoServer REST 客户端
# ============================================

class GeoServerClient:
    def __init__(self, base_url: str, user: str, password: str):
        self.base = base_url.rstrip("/")
        self.rest = f"{self.base}/rest"
        self.auth = HTTPBasicAuth(user, password)
        self.headers_json = {"Content-Type": "application/json"}
        self.headers_xml = {"Content-Type": "application/xml"}

    def ping(self) -> bool:
        try:
            r = requests.get(
                f"{self.rest}/about/version",
                auth=self.auth,
                headers={"Accept": "application/json"},
                timeout=10,
            )
            ok = r.status_code == 200
            if ok:
                try:
                    v = r.json().get("about", {}).get("resource", [{}])[0].get("Version", "?")
                except ValueError:
                    v = "?"
                print(f"[OK] GeoServer connected (version={v})")
            else:
                print(f"[FAIL] GeoServer ping status={r.status_code}: {r.text[:200]}")
            return ok
        except requests.exceptions.RequestException as e:
            print(f"[FAIL] GeoServer unreachable: {e}")
            return False

    def workspace_exists(self, ws: str) -> bool:
        r = requests.get(f"{self.rest}/workspaces/{ws}.json", auth=self.auth)
        return r.status_code == 200

    def create_workspace(self, ws: str) -> bool:
        if self.workspace_exists(ws):
            print(f"  [INFO] workspace '{ws}' 已存在")
            return True
        r = requests.post(
            f"{self.rest}/workspaces",
            auth=self.auth,
            headers=self.headers_json,
            data=json.dumps({"workspace": {"name": ws}}),
        )
        if r.status_code in (201, 409):
            print(f"  [OK] workspace '{ws}' 已创建")
            return True
        print(f"  [FAIL] 创建 workspace 失败: {r.status_code} {r.text[:200]}")
        return False

    def datastore_exists(self, ws: str, store: str) -> bool:
        r = requests.get(
            f"{self.rest}/workspaces/{ws}/datastores/{store}.json", auth=self.auth
        )
        return r.status_code == 200

    def delete_datastore(self, ws: str, store: str) -> None:
        """彻底删除 (用于重传)"""
        r = requests.delete(
            f"{self.rest}/workspaces/{ws}/datastores/{store}.json?recurse=true",
            auth=self.auth,
        )
        if r.status_code in (200, 404):
            print(f"  [INFO] datastore '{store}' 已清理 (status={r.status_code})")

    def upload_shapefile_zip(self, ws: str, store: str, zip_path: Path) -> bool:
        """file.shp PUT — GeoServer 解压 ZIP 后配置 featuretype"""
        if not zip_path.exists():
            print(f"  [FAIL] ZIP 不存在: {zip_path}")
            return False
        url = f"{self.rest}/workspaces/{ws}/datastores/{store}/file.shp"
        params = {"configure": "all"}
        with open(zip_path, "rb") as f:
            data = f.read()
        r = requests.put(
            url,
            auth=self.auth,
            params=params,
            headers={"Content-Type": "application/zip"},
            data=data,
            timeout=120,
        )
        if r.status_code in (200, 201):
            print(f"  [OK] datastore '{store}' 上传并配置完成")
            return True
        print(f"  [FAIL] 上传失败 status={r.status_code} body={r.text[:300]}")
        return False

    def apply_style(self, ws: str, layer: str, sld_body: str) -> bool:
        """上传 SLD body 到 GeoServer 并绑定为 layer 的 defaultStyle

        GeoServer 2.27 正确流程:
          1. POST /rest/styles  body=<style><name>X</name>X.sld</filename></style>
          2. PUT  /rest/styles/X  body=SLD XML
          3. PUT  /rest/layers/<ws>:<layer>  body={"layer":{"defaultStyle":{"name":"X"}}}
        """
        style_name = f"{layer}_style"

        # 1) 创建 style descriptor (已经存在也忽略)
        descriptor = (
            f"<style><name>{style_name}</name>"
            f"<filename>{style_name}.sld</filename></style>"
        )
        r = requests.post(
            f"{self.rest}/styles",
            auth=self.auth,
            headers=self.headers_xml,
            data=descriptor.encode("utf-8"),
            timeout=30,
        )
        # 201=创建成功, 409=已存在, 500+already exists 也视作 OK
        ok_codes = {200, 201, 409}
        if r.status_code == 500 and "already exists" in r.text:
            pass  # 已存在,继续
        elif r.status_code not in ok_codes:
            print(f"    [WARN] POST style descriptor 失败 status={r.status_code}: {r.text[:200]}")
            return False

        # 2) PUT SLD body 到 /rest/styles/{name} (raw=true 强制 SLD XML 解析)
        r = requests.put(
            f"{self.rest}/styles/{style_name}",
            auth=self.auth,
            params={"raw": "true"},
            headers={"Content-Type": "application/vnd.ogc.se+xml"},
            data=sld_body.encode("utf-8"),
            timeout=30,
        )
        if r.status_code not in (200, 201):
            print(f"    [WARN] PUT SLD '{style_name}' 失败 status={r.status_code}")
            print(f"    [WARN] body={r.text[:500]}")
            return False

        # 3) 绑定到 layer (先 GET 一次确保 layer 资源加载完整,避免 datastore 重传后的 null pointer)
        layer_url = f"{self.rest}/layers/{ws}:{layer}"
        # 触发 GeoServer 重建 layer 关联 (GET 会重新加载 layer 信息)
        requests.get(layer_url, auth=self.auth, timeout=15)
        layer_payload = {"layer": {"defaultStyle": {"name": style_name}, "enabled": True}}
        r = requests.put(
            layer_url,
            auth=self.auth,
            headers=self.headers_json,
            data=json.dumps(layer_payload),
            timeout=30,
        )
        if r.status_code == 200:
            print(f"    [OK] 已应用 style '{style_name}'")
            return True
        print(f"    [WARN] bind style 失败 status={r.status_code}: {r.text[:200]}")
        return False


# ============================================
# 数据处理
# ============================================

def zip_shapefile(folder: Path, name: str) -> Path:
    """打包 Shapefile；源数据缺 CRS 时只在 ZIP 中补澳门网格 .prj。"""
    zip_path = folder / f"{name}.zip"
    exts = [".shp", ".shx", ".dbf", ".prj", ".cpg"]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for ext in exts:
            f = folder / f"{name}{ext}"
            if f.exists():
                zf.write(f, arcname=f"{name}{ext}")
        if not (folder / f"{name}.prj").exists():
            zf.writestr(f"{name}.prj", MACAU_GRID_WKT)
    return zip_path


def build_wgs84_shapefile(source_folder: Path, name: str, out_dir: Path) -> Path:
    """保留几何类型和属性，将一个澳门网格 Shapefile 转换为 WGS84 ZIP。"""
    import shapefile
    from pyproj import CRS, Transformer

    source_path = source_folder / f"{name}.shp"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / name
    reader = shapefile.Reader(
        str(source_path), encoding="utf-8", encodingErrors="replace"
    )
    writer = shapefile.Writer(str(out_path), shapeType=reader.shapeType, encoding="utf-8")
    writer.autoBalance = 1
    for field_spec in reader.fields[1:]:
        writer.field(*field_spec)

    transformer = Transformer.from_crs(
        CRS.from_wkt(MACAU_GRID_WKT), CRS.from_epsg(4326), always_xy=True
    )
    written = 0
    for shape_record in reader.iterShapeRecords():
        shape = shape_record.shape
        if shape.shapeType == shapefile.NULL:
            continue
        if shape.shapeType == shapefile.POINT:
            x, y = transformer.transform(*shape.points[0])
            writer.point(x, y)
        elif shape.shapeType == shapefile.POLYLINE:
            part_starts = list(shape.parts) + [len(shape.points)]
            parts = [
                [transformer.transform(x, y) for x, y in shape.points[start:end]]
                for start, end in zip(part_starts, part_starts[1:])
            ]
            writer.line(parts)
        elif shape.shapeType == shapefile.POLYGON:
            part_starts = list(shape.parts) + [len(shape.points)]
            parts = [
                [transformer.transform(x, y) for x, y in shape.points[start:end]]
                for start, end in zip(part_starts, part_starts[1:])
            ]
            writer.poly(parts)
        else:
            raise ValueError(f"不支持的几何类型: {shape.shapeTypeName} ({source_path})")
        writer.record(*shape_record.record)
        written += 1

    writer.close()
    out_path.with_suffix(".prj").write_text(WGS84_WKT, encoding="ascii")
    out_path.with_suffix(".cpg").write_text("UTF-8", encoding="ascii")
    zip_path = zip_shapefile(out_dir, name)
    print(f"  WGS84: {zip_path.name} ({written} features)")
    return zip_path


def build_composite_shapefile(base_dir: Path, out_dir: Path) -> Path:
    """用 pyshp 合并 4 个面层并从澳门网格转换到 WGS84。"""
    import shapefile
    from pyproj import CRS, Transformer

    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = COMPOSITE_LAYER_NAME
    out_path = out_dir / out_name
    out_zip = out_dir / f"{out_name}.zip"
    transformer = Transformer.from_crs(
        CRS.from_wkt(MACAU_GRID_WKT), CRS.from_epsg(4326), always_xy=True
    )
    writer = shapefile.Writer(str(out_path), shapeType=shapefile.POLYGON)
    writer.autoBalance = 1
    writer.field("source", "C", size=16)
    writer.field("lulc_cls", "C", size=32)
    total = 0

    for member in COMPOSITE_MEMBERS:
        folder = base_dir / member
        shp = folder / f"{member}.shp"
        if not shp.exists():
            print(f"  [WARN] 跳过 composite 成员 {member}: shp 不存在")
            continue
        reader = shapefile.Reader(str(shp))
        member_count = 0
        for shape in reader.iterShapes():
            if shape.shapeType not in (shapefile.POLYGON, shapefile.POLYGONM, shapefile.POLYGONZ):
                continue
            part_starts = list(shape.parts) + [len(shape.points)]
            parts = []
            for start, end in zip(part_starts, part_starts[1:]):
                part = [transformer.transform(x, y) for x, y in shape.points[start:end]]
                if len(part) >= 4:
                    parts.append(part)
            if not parts:
                continue
            writer.poly(parts)
            writer.record(member, COMPOSITE_CLASS_MAP.get(member, member))
            member_count += 1
        total += member_count
        print(f"  [INFO] composite +{member}: {member_count} features")

    writer.close()
    if not total:
        raise RuntimeError("Composite 没有任何成员可合成")
    out_path.with_suffix(".prj").write_text(WGS84_WKT, encoding="ascii")
    out_path.with_suffix(".cpg").write_text("UTF-8", encoding="ascii")

    # zip
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for ext in [".shp", ".shx", ".dbf", ".prj", ".cpg"]:
            f = out_path.with_suffix(ext)
            if f.exists():
                zf.write(f, arcname=f"{out_name}{ext}")

    print(f"  [OK] composite 已生成: {out_zip} ({total} features)")
    return out_zip


# ============================================
# 主流程
# ============================================

def main():
    # 加载 .env
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

    gs_url = os.getenv("GEOSERVER_URL") or os.getenv("GEOSERVER_INTERNAL_URL") or DEFAULT_GEOSERVER_URL
    gs_user = os.getenv("GEOSERVER_USER", "chensi")
    gs_pass = os.getenv("GEOSERVER_PASS") or os.getenv("GEOSERVER_PASSWORD") or ""
    lulc_dir = Path(os.getenv("MACAU_LULC_DIR", DEFAULT_LULC_DIR))
    dry_run = os.getenv("DRY_RUN", "false").lower() in ("1", "true", "yes")

    print("=" * 70)
    print("澳门土地利用 (LULC) Shapefile 上传脚本")
    print("=" * 70)
    print(f"GeoServer:  {gs_url}")
    print(f"Workspace:  {WORKSPACE}")
    print(f"Data dir:   {lulc_dir}")
    print(f"User:       {gs_user}")
    print(f"DRY_RUN:    {dry_run}")
    print()

    if not dry_run and not gs_pass:
        print("[ERROR] 未设置 GEOSERVER_PASS。请在 .env 中配置。")
        sys.exit(1)

    if not lulc_dir.exists():
        print(f"[ERROR] 数据目录不存在: {lulc_dir}")
        sys.exit(1)

    client = GeoServerClient(gs_url, gs_user, gs_pass)
    if not dry_run:
        if not client.ping():
            print("[ERROR] GeoServer 不可达,终止。")
            sys.exit(1)

        # workspace
        if not client.create_workspace(WORKSPACE):
            sys.exit(1)
    print()

    # ---------- Part 1: 14 个原始图层 ----------
    print(f"[Part 1] 上传 {len(LAYER_REGISTRY)} 个原始图层到 workspace '{WORKSPACE}'")
    print("-" * 70)
    skip_part1 = os.getenv("SKIP_PART1", "false").lower() in ("1", "true", "yes")
    if skip_part1:
        print("[SKIP_PART1] 跳过 datastore 上传 (假设原始图层已存在), 但仍会重做 SLD 绑定")
    stats: Dict[str, str] = {}

    for spec in LAYER_REGISTRY:
        if skip_part1:
            stats[spec.layer_name] = "skipped-upload"
        else:
            folder = lulc_dir / spec.folder
            if not folder.exists():
                print(f"[SKIP] {spec.layer_name}: 目录不存在 {folder}")
                stats[spec.layer_name] = "skip-missing-dir"
                continue

            shp_name = spec.shp_name or spec.folder
            shp = folder / f"{shp_name}.shp"
            if not shp.exists():
                print(f"[SKIP] {spec.layer_name}: {shp.name} 不存在")
                stats[spec.layer_name] = "skip-no-shp"
                continue

            print(f"\n→ {spec.layer_name}  ({spec.geom}, {spec.semantic})")

            if dry_run:
                stats[spec.layer_name] = "dry-run"
                continue

            # 1. 重传前先清理 (避免 PUT 失败时残留)
            client.delete_datastore(WORKSPACE, spec.layer_name)
            time.sleep(0.3)

            # 2. 转为 WGS84 后打包，避免 GeoServer 无法识别澳门地方 CRS
            zip_path = build_wgs84_shapefile(
                folder, shp_name, lulc_dir / "_wgs84" / shp_name
            )
            size = zip_path.stat().st_size
            print(f"  ZIP: {zip_path.name} ({size/1024:.1f} KB)")

            # 3. 上传
            ok = client.upload_shapefile_zip(WORKSPACE, spec.layer_name, zip_path)
            if not ok:
                stats[spec.layer_name] = "upload-failed"
                continue
            time.sleep(0.5)

            stats[spec.layer_name] = "ok"

        # 4. (无论是否跳过上传) 都应用样式
        if spec.geom == "polygon":
            sld = build_polygon_sld(spec.layer_name, spec.semantic, "#9E9E9E", _color_for_semantic(spec.semantic))
        elif spec.geom == "polyline":
            sld = POLYLINE_SLD_TEMPLATE.format(name=spec.layer_name, title=spec.semantic, color=_color_for_semantic(spec.semantic))
        else:  # point
            sld = POINT_SLD_TEMPLATE.format(name=spec.layer_name, title=spec.semantic, color=_color_for_semantic(spec.semantic))
        # layer 真实名是 shp 文件名,大小写由源文件决定 (doorNo 必须保留 N 大写)
        actual_layer = spec.shp_name or spec.folder
        client.apply_style(WORKSPACE, actual_layer, sld)

    # ---------- Part 2: 合成 MO_LandUse_Composite ----------
    print("\n" + "=" * 70)
    print(f"[Part 2] 合成 {COMPOSITE_LAYER_NAME}")
    print("-" * 70)

    if not dry_run:
        out_dir = lulc_dir / "_composite"
        try:
            comp_zip = build_composite_shapefile(lulc_dir, out_dir)
        except Exception as e:
            print(f"[FAIL] composite 构建失败: {e}")
            stats[COMPOSITE_LAYER_NAME] = "build-failed"
            comp_zip = None

        if comp_zip and comp_zip.exists():
            client.delete_datastore(WORKSPACE, COMPOSITE_LAYER_NAME)
            time.sleep(0.3)
            ok = client.upload_shapefile_zip(WORKSPACE, COMPOSITE_LAYER_NAME, comp_zip)
            if ok:
                comp_sld = build_composite_sld(COMPOSITE_LAYER_NAME, "Macau Land Use Composite")
                # composite featuretype 名 = shp 文件名 = MO_LandUse_Composite (保留大小写)
                client.apply_style(WORKSPACE, COMPOSITE_LAYER_NAME, comp_sld)
                stats[COMPOSITE_LAYER_NAME] = "ok"
            else:
                stats[COMPOSITE_LAYER_NAME] = "upload-failed"
    else:
        stats[COMPOSITE_LAYER_NAME] = "dry-run"

    # ---------- 汇总 ----------
    print("\n" + "=" * 70)
    print("PUBLISH SUMMARY")
    print("=" * 70)
    ok_count = sum(1 for v in stats.values() if v == "ok")
    fail_count = sum(1 for v in stats.values() if v.startswith(("upload-failed", "build-failed")))
    skip_count = sum(1 for v in stats.values() if v.startswith("skip-"))
    print(f"Total:    {len(stats)}")
    print(f"OK:       {ok_count}")
    print(f"Failed:   {fail_count}")
    print(f"Skipped:  {skip_count}")
    print()
    for name, status in stats.items():
        print(f"  {status:<18} {name}")

    if ok_count > 0:
        print()
        print(f"WMS endpoint:")
        print(f"  {gs_url}/{WORKSPACE}/wms")
        print(f"预览:")
        print(f"  {gs_url}/web/wicket/bookmarkable/org.geoserver.web.demo.MapPreviewPage")


if __name__ == "__main__":
    main()