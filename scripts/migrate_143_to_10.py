# -*- coding: utf-8 -*-
"""
143.89.22.7:8090 → 10.253.22.15:8080 平台用图层迁移脚本 (修订版)
====================================================================

修订要点 (vs 初版)
------------------
1. **datastore ≠ featuretype 名**: 143 上 datastore 名 `HK_Road_CENTERLINE` 但
   featuretype 名是单数 `CENTERLINE` (WFS typeName 必须用 featuretype 名)。
   COP vector 同理 (datastore `taiping_building` -> layer `Building`)。
2. **143 GeoServer `application/json` outputFormat 不可用** (返回 ServiceException),
   改用 **GML3** 下载 + **ogr2ogr** / pyogrio 转换为 GeoJSON 上传到 10.253。
3. 或者更稳: 直接 **SHAPE-ZIP 下载 + GeoServer `file.shp` PUT 上传** (与
   upload_macau_infrastructure_to_geoserver.py 同款路径, 已被验证过)。

策略
----
对每个 vector datastore:
1. WFS GetFeature outputFormat=SHAPE-ZIP → 下载 .zip
2. PUT /rest/workspaces/<ws>/datastores/<store>/file.shp
   (zip 内含 .shp/.shx/.dbf/.prj/.cpg)
   GeoServer 自动 publish featuretype
4. cleanup_stale_featuretype (避免 datastore 残留额外 featuretype)

对每个 raster coverage:
1. WCS GetCoverage format=image/tiff 全幅下载
2. PUT /rest/resource/{ws}/{layer}.tif 上传到 GeoServer data_dir
3. POST coveragestore (类型 GeoTIFF, url=file:data/<ws>/<layer>.tif)

迁移范围
--------
- **必迁 (10 个, 平台前端实际引用)**: COP: 3 vector (Building/ENTLI/taiping_boundary) + 7 raster
- **可选 (19 个, 143 上独有但前端未引用)**: natcat_platform 下 17 HK_* + 2 MO_*
  这些是为了数据完整性 + 未来扩展用, 与 .env.local 切换无强依赖

环境变量 / 命令行
------------------
- GEOSERVER_SRC / GEOSERVER_DST  (默认 143.89.22.7:8090 / 10.253.22.15:8080)
- GEOSERVER_PASS_SRC / GEOSERVER_PASS_DST
- OUT_DIR
- --only all|natcat_platform|COP.vector|COP.raster
- --force  覆盖已存在的 datastore/coverage (默认跳过)

作者: chensi
日期: 2026-09-03
"""

from __future__ import annotations

import argparse
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
from urllib.parse import quote

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import requests
from requests.auth import HTTPBasicAuth


# ============================================
# 配置
# ============================================

DEFAULT_SRC = "http://143.89.22.7:8090/geoserver"
DEFAULT_DST = "http://10.253.22.15:8080/geoserver"

DEFAULT_OUT_DIR = Path(r"D:\Nat Cat Platform\UI_system\scripts\migration_out")


@dataclass
class VectorMigration:
    """单个 vector datastore 的迁移规格"""
    workspace: str           # 'natcat_platform' | 'COP'
    datastore: str           # datastore 名 (如 'HK_Road_CENTERLINE' / 'taiping_building')
    featuretype: str         # featuretype 名 (如 'CENTERLINE' / 'Building')
    description: str = ""


@dataclass
class RasterMigration:
    """单个 raster coverage 的迁移规格"""
    workspace: str           # 'COP'
    layer: str               # coverage 名 (含空格也允许)
    coveragestore: str       # coveragestore 名 (空格转 '+')
    description: str = ""


# ============================================
# 迁移清单 (datastore -> featuretype 映射来自 143 实际探测结果)
# ============================================

# natcat_platform: 19 个 datastore (datastore 名 ≠ featuretype 名)
NATCAT_VECTOR: List[VectorMigration] = [
    VectorMigration("natcat_platform", "HK_Drainage_Conduits", "conduits", "HK drainage conduits"),
    VectorMigration("natcat_platform", "HK_Drainage_Nodes",    "nodes",    "HK drainage nodes"),
    VectorMigration("natcat_platform", "HK_Road_BUS_ONLY_LANE",     "BUS_ONLY_LANE",     "HK road bus-only lane"),
    VectorMigration("natcat_platform", "HK_Road_CENTERLINE",        "CENTERLINE",        "HK road centerline"),
    VectorMigration("natcat_platform", "HK_Road_INTERSECTION",      "INTERSECTION",      "HK road intersection"),
    VectorMigration("natcat_platform", "HK_Road_NSR",               "NSR",               "HK road NSR"),
    VectorMigration("natcat_platform", "HK_Road_ONSTREETPARK",      "ONSTREETPARK",      "HK road on-street park"),
    VectorMigration("natcat_platform", "HK_Road_PEDESTRIAN_ZONE",   "PEDESTRIAN_ZONE",   "HK road pedestrian zone"),
    VectorMigration("natcat_platform", "HK_Road_PERMIT",            "PERMIT",            "HK road permit"),
    VectorMigration("natcat_platform", "HK_Road_PROHIBITION",       "PROHIBITION",       "HK road prohibition"),
    VectorMigration("natcat_platform", "HK_Road_ROUNDABOUT",        "ROUNDABOUT",        "HK road roundabout"),
    VectorMigration("natcat_platform", "HK_Road_RUN_IN_OUT",        "RUN_IN_OUT",        "HK road run-in/out"),
    VectorMigration("natcat_platform", "HK_Road_SPEED_LIMIT",       "SPEED_LIMIT",       "HK road speed limit"),
    VectorMigration("natcat_platform", "HK_Road_TRAFFIC_FEATURES",  "TRAFFIC_FEATURES",  "HK road traffic features"),
    VectorMigration("natcat_platform", "HK_Road_TURN",              "TURN",              "HK road turn"),
    VectorMigration("natcat_platform", "HK_Road_VEHICLE_RESTRICTION","VEHICLE_RESTRICTION","HK road vehicle restriction"),
    VectorMigration("natcat_platform", "HK_Storage_Tanks",          "storage_tanks",     "HK storage tanks"),
    VectorMigration("natcat_platform", "MO_DistrictBoundary",       "boundary",          "MO district boundary"),
    VectorMigration("natcat_platform", "MO_StatArea",               "stat",              "MO statistical area"),
]

# COP vector: 3 个 (datastore 命名已带 _wgs84 等后缀的不需要)
COP_VECTOR: List[VectorMigration] = [
    VectorMigration("COP", "taiping_building", "Building",        "COP Taiping Building polygons"),
    VectorMigration("COP", "ENTLI",            "ENTLI",           "COP Nighttime Light Index"),
    VectorMigration("COP", "taiping_boundary", "taiping_boundary","COP Taiping HK boundary"),
]

# COP raster: 7 个 GeoTIFF
COP_RASTER: List[RasterMigration] = [
    RasterMigration("COP", "hkSAR",                              "hkSAR",                              "HK SAR satellite imagery"),
    RasterMigration("COP", "taiping_Annual_rainfall",            "taiping_rainfall",                   "Taiping annual rainfall"),
    RasterMigration("COP", "Flood_Depth _Return_Period_100yr",   "Flood_Depth+_Return_Period_100yr",   "Flood depth 100yr"),
    RasterMigration("COP", "Flood_Depth _Return_Period_200yr",   "Flood_Depth+_Return_Period_200yr",   "Flood depth 200yr"),
    RasterMigration("COP", "Flood_Depth _Return_Period_500yr",   "taiping_flood_depth_500",            "Flood depth 500yr"),
    RasterMigration("COP", "Flood_Depth _Return_Period_50yr",    "Flood_Depth+_Return_Period_50yr",    "Flood depth 50yr"),
    RasterMigration("COP", "Flood_Depth _Return_Period_20yr",    "Flood_Depth+_Return_Period_20yr",    "Flood depth 20yr"),
]


# ============================================
# GeoServer 客户端
# ============================================

class GeoServerClient:
    def __init__(self, base_url: str, user: str, password: str):
        self.base = base_url.rstrip("/")
        self.rest = f"{self.base}/rest"
        self.auth = HTTPBasicAuth(user, password)
        self.headers_json = {"Content-Type": "application/json"}
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

    def workspace_exists(self, ws: str) -> bool:
        r = requests.get(f"{self.rest}/workspaces/{ws}.json", auth=self.auth, timeout=10)
        return r.status_code == 200

    def create_workspace(self, ws: str) -> bool:
        if self.workspace_exists(ws):
            print(f"  [OK] workspace '{ws}' 已存在")
            return True
        body = f"<workspace><name>{ws}</name></workspace>"
        r = requests.post(
            f"{self.rest}/workspaces", auth=self.auth,
            headers=self.headers_xml, data=body.encode("utf-8"), timeout=10,
        )
        if r.status_code in (200, 201):
            print(f"  [OK] workspace '{ws}' 创建成功")
            return True
        print(f"  [FAIL] workspace 创建失败: {r.status_code} {r.text[:200]}")
        return False

    def datastore_exists(self, ws: str, store: str) -> bool:
        r = requests.get(
            f"{self.rest}/workspaces/{ws}/datastores/{store}.json",
            auth=self.auth, timeout=10,
        )
        return r.status_code == 200

    def coveragestore_exists(self, ws: str, store: str) -> bool:
        r = requests.get(
            f"{self.rest}/workspaces/{ws}/coveragestores/{store}.json",
            auth=self.auth, timeout=10,
        )
        return r.status_code == 200

    def datastore_featuretypes(self, ws: str, store: str) -> List[str]:
        """列出 datastore 下的 featuretype"""
        r = requests.get(
            f"{self.rest}/workspaces/{ws}/datastores/{store}/featuretypes.json",
            auth=self.auth, timeout=10,
        )
        if r.status_code != 200:
            return []
        return [f["name"] for f in r.json().get("featureTypes", {}).get("featureType", [])]

    def delete_datastore(self, ws: str, store: str) -> None:
        if not self.datastore_exists(ws, store):
            return
        try:
            r = requests.delete(
                f"{self.rest}/workspaces/{ws}/datastores/{store}.json?recurse=true",
                auth=self.auth, timeout=120,
            )
            print(f"  [CLEAN] datastore '{ws}:{store}' 删除 status={r.status_code}")
        except Exception as e:
            print(f"  [WARN] DELETE datastore '{ws}:{store}' 失败: {e}")

    def upload_shapefile_zip(
        self, ws: str, store: str, zip_path: Path, force: bool,
    ) -> bool:
        """PUT shapefile zip 到 file.shp endpoint"""
        if self.datastore_exists(ws, store):
            if not force:
                print(f"  [SKIP] datastore '{ws}:{store}' 已存在")
                return False
            self.delete_datastore(ws, store)
            time.sleep(0.5)
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
            print(f"  [OK] datastore '{ws}:{store}' 上传成功 ({len(data)/1024:.1f} KB)")
            return True
        print(f"  [FAIL] 上传失败 status={r.status_code}: {r.text[:300]}")
        return False

    def cleanup_stale_featuretypes(
        self, ws: str, store: str, expected: List[str],
    ) -> None:
        """删除 datastore 下非期望的 featuretype (避免 *_wgs84 等污染)"""
        existing = self.datastore_featuretypes(ws, store)
        for ft in existing:
            if ft in expected:
                continue
            print(f"  [CLEAN] 清理残留 featuretype '{ws}:{store}:{ft}'")
            # 删除 layer
            requests.delete(
                f"{self.rest}/workspaces/{ws}/layers/{quote(ft, safe='')}.json?recurse=true",
                auth=self.auth, timeout=60,
            )
            # 删除 featuretype
            requests.delete(
                f"{self.rest}/workspaces/{ws}/datastores/{store}/featuretypes/{quote(ft, safe='')}.json?recurse=true",
                auth=self.auth, timeout=60,
            )

    def upload_resource(self, resource_path: str, local_path: Path) -> bool:
        """PUT /rest/resource/{path} 上传本地文件到 GeoServer data_dir

        注: GeoServer 2.27 的 /rest/resource 端点仅支持 PUT/GET/DELETE/OPTIONS,
        POST 返回 405。直接 PUT 即可, GeoServer 自动 upsert。
        """
        url = f"{self.rest}/resource/{quote(resource_path, safe='/')}"
        with open(local_path, "rb") as f:
            data = f.read()
        r = requests.put(
            url, auth=self.auth, data=data,
            headers={"Content-Type": "application/octet-stream"}, timeout=600,
        )
        if r.status_code in (200, 201):
            print(f"  [OK] resource '{resource_path}' PUT ({len(data)/1024:.1f} KB)")
            return True
        print(f"  [FAIL] resource PUT 失败 status={r.status_code}: {r.text[:200]}")
        return False

    def create_geotiff_coveragestore(
        self, ws: str, store: str, tif_url: str, force: bool,
    ) -> bool:
        if self.coveragestore_exists(ws, store):
            if not force:
                print(f"  [SKIP] coveragestore '{ws}:{store}' 已存在")
                return False
            print(f"  [FORCE] 删除已存在 coveragestore '{ws}:{store}'")
            requests.delete(
                f"{self.rest}/workspaces/{ws}/coveragestores/{store}.json?recurse=true",
                auth=self.auth, timeout=120,
            )
            time.sleep(1.0)
        body = {
            "coverageStore": {
                "name": store,
                "type": "GeoTIFF",
                "enabled": True,
                "url": tif_url,
                "workspace": {"name": ws},
            },
        }
        r = requests.post(
            f"{self.rest}/workspaces/{ws}/coveragestores", auth=self.auth,
            headers=self.headers_json, json=body, timeout=60,
        )
        if r.status_code in (200, 201):
            print(f"  [OK] coveragestore '{ws}:{store}' 创建成功 (type=GeoTIFF)")
            return True
        print(f"  [FAIL] coveragestore 创建失败 status={r.status_code}: {r.text[:300]}")
        return False


# ============================================
# WFS / WCS 下载
# ============================================

def wfs_get_shapefile_zip(
    src: GeoServerClient, ws: str, featuretype: str, out_path: Path,
    timeout_sec: int = 600,
) -> bool:
    """WFS GetFeature outputFormat=SHAPE-ZIP → zip

    注: 143 GeoServer 的 application/json 不可用, 但 SHAPE-ZIP 正常。
    typeName 用 featuretype 名 (不是 datastore 名)。
    """
    params = {
        "service": "WFS", "version": "1.0.0", "request": "GetFeature",
        "typeName": f"{ws}:{featuretype}",
        "outputFormat": "SHAPE-ZIP",
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with requests.get(
            f"{src.base}/ows", auth=src.auth, params=params,
            stream=True, timeout=timeout_sec,
        ) as r:
            r.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 256):
                    f.write(chunk)
        size = out_path.stat().st_size
        # 验证 zip 内容
        with zipfile.ZipFile(out_path) as zf:
            inner = zf.namelist()
        print(f"  [OK] WFS {ws}:{featuretype} → {out_path.name} ({size/1024:.1f} KB)")
        print(f"       zip 内: {inner}")
        return True
    except Exception as e:
        print(f"  [FAIL] WFS 下载 {ws}:{featuretype}: {e}")
        if out_path.exists():
            out_path.unlink(missing_ok=True)
        return False


def wcs_get_geotiff(
    src: GeoServerClient, ws: str, layer: str, out_path: Path,
    timeout_sec: int = 1800,
) -> bool:
    """WCS GetCoverage format=image/tiff 全幅下载 (用户决策 2026-09-03)"""
    params = {
        "service": "WCS", "version": "2.0.1", "request": "GetCoverage",
        "coverageId": f"{ws}:{layer}",
        "format": "image/tiff",
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with requests.get(
            f"{src.base}/ows", auth=src.auth, params=params,
            stream=True, timeout=timeout_sec,
        ) as resp:
            resp.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    f.write(chunk)
        size = out_path.stat().st_size
        if size < 1024:
            # response might be error XML
            print(f"  [WARN] WCS 返回过小 ({size} B), 可能是错误响应")
            content = out_path.read_bytes().decode("utf-8", errors="replace")[:300]
            print(f"         {content}")
            out_path.unlink(missing_ok=True)
            return False
        print(f"  [OK] WCS {ws}:{layer} → {out_path.name} ({size/1024/1024:.1f} MB)")
        return True
    except Exception as e:
        print(f"  [FAIL] WCS 下载 {ws}:{layer}: {e}")
        if out_path.exists():
            out_path.unlink(missing_ok=True)
        return False


# ============================================
# 迁移主流程
# ============================================

def migrate_vector(
    src: GeoServerClient, dst: GeoServerClient, spec: VectorMigration,
    out_dir: Path, force: bool, dry_run: bool,
) -> str:
    """迁移单个 vector datastore

    注: 由于 143 上 datastore 名与 featuretype 名常不同 (如 datastore
    HK_Road_CENTERLINE, featuretype CENTERLINE), 这里:
    - WFS typeName = featuretype 名 (下载数据)
    - 目标 datastore 名 = spec.datastore (与 143 一致)
    - 目标 featuretype 名 = spec.featuretype (与 143 一致)
    """
    safe_ft = spec.featuretype.replace(" ", "_")
    zip_local = out_dir / spec.workspace / f"{spec.datastore}__{safe_ft}.zip"

    print(f"\n→ [{spec.workspace}:{spec.datastore}/{spec.featuretype}] {spec.description}")

    if dry_run:
        print(f"  [DRY] WFS GetFeature typeName={spec.workspace}:{spec.featuretype} outputFormat=SHAPE-ZIP")
        print(f"  [DRY] PUT shapefile zip → datastore '{spec.workspace}:{spec.datastore}'")
        print(f"  [DRY] cleanup_stale_featuretypes → 只保留 '{spec.featuretype}'")
        return "dry-run"

    # 1. WFS 下载 SHAPE-ZIP
    if not wfs_get_shapefile_zip(src, spec.workspace, spec.featuretype, zip_local):
        return f"fail-wfs:{spec.workspace}:{spec.featuretype}"

    # 2. 上传 shapefile zip 到目标 datastore
    if not dst.upload_shapefile_zip(spec.workspace, spec.datastore, zip_local, force):
        if not dst.datastore_exists(spec.workspace, spec.datastore):
            return f"fail-datastore:{spec.workspace}:{spec.datastore}"
        # 已存在 → 跳过 cleanup 步骤 (因为 force=False)

    # 3. 清理残留 featuretype
    try:
        dst.cleanup_stale_featuretypes(
            spec.workspace, spec.datastore, [spec.featuretype]
        )
    except Exception as e:
        print(f"  [WARN] cleanup 失败: {e}")

    # 4. Reload
    try:
        requests.post(f"{dst.rest}/reload", auth=dst.auth, timeout=10)
    except Exception:
        pass

    return "ok"


def migrate_raster(
    src: GeoServerClient, dst: GeoServerClient, spec: RasterMigration,
    out_dir: Path, force: bool, dry_run: bool,
) -> str:
    """迁移单个 raster coverage

    GeoServer 限制:
    - 文件名可以包含空格 (Windows OK)
    - Coverage 名**不能**含空格 (会被拒绝: 'coverageName X not supported')
    - 因此 workflow:
      1. 下载到本地文件名 = {layer}.tif (含空格)
      2. 上传到 /resource/{ws}/{layer}.tif (含空格)
      3. 创建 coveragestore url=file:{ws}/{layer_with_space}.tif
      4. POST coverage name={layer_with_space} (临时, 含空格 GeoServer 不让)
         → 改用临时名 layer_no_space (空格→_), 再 PUT coverage.json 把 name
           改成 {layer} 含空格版本 (PUT 允许改名, 但 POST 不接受空格)
    """
    # 本地文件名 (含空格, Windows 支持)
    local_name = f"{spec.layer}.tif"
    tif_local = out_dir / spec.workspace / local_name

    print(f"\n→ [{spec.workspace}:{spec.layer}] {spec.description}")

    if dry_run:
        print(f"  [DRY] WCS GetCoverage coverageId={spec.workspace}:{spec.layer} format=image/tiff")
        print(f"  [DRY] PUT resource {spec.workspace}/{spec.layer}.tif")
        print(f"  [DRY] POST coveragestore '{spec.workspace}:{spec.coveragestore}'")
        print(f"  [DRY] POST coverage (no-space name) → PUT coverage.json (rename to space name)")
        return "dry-run"

    # 1. WCS 下载 GeoTIFF
    if not wcs_get_geotiff(src, spec.workspace, spec.layer, tif_local):
        return f"fail-wcs:{spec.workspace}:{spec.layer}"

    # 2. 上传到 GeoServer data dir
    resource_path = f"{spec.workspace}/{spec.layer}.tif"
    if not dst.upload_resource(resource_path, tif_local):
        return f"fail-upload-resource:{spec.workspace}:{spec.layer}"

    # 3. 创建 coveragestore (force=true 删除旧的)
    tif_url = f"file:{spec.workspace}/{quote(spec.layer, safe='')}.tif"
    if not dst.create_geotiff_coveragestore(
        spec.workspace, spec.coveragestore, tif_url, force=True
    ):
        return f"fail-coveragestore:{spec.workspace}:{spec.coveragestore}"

    # 4. POST coverage (临时无空格名, 因为 GeoServer POST 拒绝含空格 coverage name)
    tmp_name = spec.layer.replace(" ", "_")
    publish_body = {
        "coverage": {
            "name": tmp_name,
            "nativeCoverageName": tmp_name,
        },
    }
    pub_resp = requests.post(
        f"{dst.rest}/workspaces/{spec.workspace}/coveragestores/{spec.coveragestore}/coverages",
        auth=dst.auth, json=publish_body, timeout=60,
    )
    if pub_resp.status_code not in (200, 201):
        print(f"  [FAIL] coverage publish status={pub_resp.status_code}: {pub_resp.text[:200]}")
        return f"fail-publish-coverage:{spec.workspace}:{spec.coveragestore}:{spec.layer}"

    # 5. PUT coverage.json 把 name 从无空格改为含空格 (PUT 允许改名)
    rename_body = {
        "coverage": {
            "name": spec.layer,
            "nativeCoverageName": tmp_name,
        },
    }
    safe_cs = quote(spec.coveragestore, safe="")
    safe_tmp = quote(tmp_name, safe="")
    rename_resp = requests.put(
        f"{dst.rest}/workspaces/{spec.workspace}/coveragestores/{safe_cs}/coverages/{safe_tmp}.json",
        auth=dst.auth, json=rename_body, timeout=60,
    )
    if rename_resp.status_code in (200, 201):
        print(f"  [OK] coverage '{tmp_name}' → '{spec.layer}' rename 成功")
    else:
        print(f"  [WARN] rename to space version status={rename_resp.status_code}: {rename_resp.text[:200]}")

    # 6. Reload
    try:
        requests.post(f"{dst.rest}/reload", auth=dst.auth, timeout=10)
    except Exception:
        pass

    return "ok"


# ============================================
# 入口
# ============================================

def main() -> int:
    p = argparse.ArgumentParser(description="143.89.22.7 → 10.253.22.15 平台用图层迁移")
    p.add_argument("--src", default=os.getenv("GEOSERVER_SRC", DEFAULT_SRC))
    p.add_argument("--dst", default=os.getenv("GEOSERVER_DST", DEFAULT_DST))
    p.add_argument("--src-user", default="admin")
    p.add_argument("--src-pass", default=os.getenv("GEOSERVER_PASS_SRC", "geoserver"))
    p.add_argument("--dst-user", default="chensi")
    p.add_argument("--dst-pass", default=os.getenv("GEOSERVER_PASS_DST", "CSma19921020~!"))
    p.add_argument("--out-dir", default=os.getenv("OUT_DIR", str(DEFAULT_OUT_DIR)))
    p.add_argument(
        "--only",
        choices=["all", "natcat_platform", "COP.vector", "COP.raster"],
        default="all",
    )
    p.add_argument("--force", action="store_true",
                   help="覆盖已存在的 datastore/coverage (默认跳过)")
    p.add_argument("--dry-run", action="store_true",
                   help="只打印操作, 不实际下载/上传")
    args = p.parse_args()

    out_dir = Path(args.out_dir)
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    src = GeoServerClient(args.src, args.src_user, args.src_pass)
    dst = GeoServerClient(args.dst, args.dst_user, args.dst_pass)

    print("=" * 70)
    print("  GeoServer Layer Migration: 143.89.22.7 → 10.253.22.15")
    print("=" * 70)
    print(f"  SRC:    {args.src} (user={args.src_user})")
    print(f"  DST:    {args.dst} (user={args.dst_user})")
    print(f"  OUT:    {out_dir}")
    print(f"  --only: {args.only}")
    print(f"  --force:{args.force}")
    print(f"  --dry-run: {args.dry_run}")
    print()

    if not args.dry_run:
        if not src.ping():
            print("[ABORT] SRC GeoServer 不可达")
            return 1
        if not dst.ping():
            print("[ABORT] DST GeoServer 不可达")
            return 1
        # 准备 workspaces
        dst.create_workspace("natcat_platform")
        dst.create_workspace("COP")

    stats: Dict[str, str] = {}

    if args.only in ("all", "natcat_platform"):
        print(f"\n=== natcat_platform: 迁移 {len(NATCAT_VECTOR)} 个 vector datastore ===")
        for spec in NATCAT_VECTOR:
            key = f"natcat_platform:{spec.datastore}/{spec.featuretype}"
            stats[key] = migrate_vector(src, dst, spec, out_dir,
                                        force=args.force, dry_run=args.dry_run)

    if args.only in ("all", "COP.vector"):
        print(f"\n=== COP vector: 迁移 {len(COP_VECTOR)} 个 datastore ===")
        for spec in COP_VECTOR:
            key = f"COP:{spec.datastore}/{spec.featuretype}"
            stats[key] = migrate_vector(src, dst, spec, out_dir,
                                        force=args.force, dry_run=args.dry_run)

    if args.only in ("all", "COP.raster"):
        print(f"\n=== COP raster: 迁移 {len(COP_RASTER)} 个 GeoTIFF ===")
        for spec in COP_RASTER:
            key = f"COP:{spec.coveragestore}/{spec.layer}"
            stats[key] = migrate_raster(src, dst, spec, out_dir,
                                        force=args.force, dry_run=args.dry_run)

    print("\n" + "=" * 70)
    print("[SUMMARY]")
    print("=" * 70)
    ok = sum(1 for v in stats.values() if v == "ok")
    fail = sum(1 for v in stats.values() if v.startswith("fail"))
    skip = sum(1 for v in stats.values() if v.startswith("skip"))
    dry = sum(1 for v in stats.values() if v == "dry-run")
    print(f"  ok={ok}  fail={fail}  skip={skip}  dry-run={dry}  total={len(stats)}")
    for k, v in stats.items():
        marker = "✓" if v == "ok" else ("·" if v.startswith(("skip", "dry")) else "✗")
        print(f"    {marker} {k}: {v}")

    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())