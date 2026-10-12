"""
scripts/mask_hk_tiffs.py

诊断 + mask HK_LULC_DynamicWorld.tif 和 HK_SOIL_OpenLandMap.tif 到香港行政边界

边界来源: D:/Nat Cat Platform/Data/Shapefile/Hong_Kong_18_Districts/Hong_Kong_18_Districts.shp
输出:     D:/Nat Cat Platform/UI_system/.masked_tiffs/{name}_masked.tif
上传到:   http://143.89.22.7:8090/geoserver (admin/geoserver),workspace=natcat_platform

环境依赖 (Anaconda prompt):
    conda install -c conda-forge rasterio geopandas shapely requests fiona

用法:
    python scripts/mask_hk_tiffs.py
"""

import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.mask import mask as rasterio_mask
from rasterio.warp import transform as rio_transform
from rasterio.crs import CRS
import geopandas as gpd
import requests
from requests.auth import HTTPBasicAuth

# ===== 绝对路径配置 =====
HK_BOUNDARY_SHP = Path(r"D:/Nat Cat Platform/Data/Shapefile/Hong_Kong_18_Districts/Hong_Kong_18_Districts.shp")
SOURCE_DIR      = Path(r"D:/HK-MO-Deliverable/HK/Advertising/underlying")
OUTPUT_DIR      = Path(r"D:/Nat Cat Platform/UI_system/.masked_tiffs")
OUTPUT_DIR.mkdir(exist_ok=True)

GEOSERVER = "http://143.89.22.7:8090/geoserver"
GEOSERVER_USER = "admin"
GEOSERVER_PASS = "geoserver"
WORKSPACE = "natcat_platform"

TARGETS = [
    {"tif": "LULC_DynamicWorld.tif", "layer": "HK_LULC_DynamicWorld"},
    {"tif": "SOIL_OpenLandMap.tif",  "layer": "HK_SOIL_OpenLandMap"},
]

# EPSG:2326 (Hong Kong 1980 Grid System) 的 proj4 string
# (从 GeoServer 元数据导出,直接用 string 避免依赖 proj.db)
HK_1980_GRID_PROJ4 = (
    "+proj=tmerc +lat_0=22.31213333333333 +lon_0=114.1785555555556 +k=1 "
    "+x_0=836694.05 +y_0=819069.8 +ellps=intl "
    "+towgs84=-162.619,-276.959,-161.764,0.067753,2.243648,1.158828,-1.094246 "
    "+units=m +no_defs"
)
WGS84_PROJ4 = "+proj=longlat +datum=WGS84 +no_defs"


def _reproject_ring(coords, src_crs, dst_crs):
    """reproject 一个 ring (List of (x, y))"""
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    xs2, ys2 = rio_transform(src_crs, dst_crs, xs, ys)
    return [(xs2[i], ys2[i]) for i in range(len(coords))]


def _reproject_single(geom, src_crs, dst_crs):
    """把单个 shapely 几何从 src_crs 重投影到 dst_crs"""
    if geom.is_empty:
        return geom
    if geom.geom_type == "Polygon":
        exterior = _reproject_ring(geom.exterior.coords, src_crs, dst_crs)
        interiors = [_reproject_ring(r.coords, src_crs, dst_crs) for r in geom.interiors]
        return type(geom)(exterior, interiors)
    elif geom.geom_type == "MultiPolygon":
        polys = []
        for p in geom.geoms:
            exterior = _reproject_ring(p.exterior.coords, src_crs, dst_crs)
            interiors = [_reproject_ring(r.coords, src_crs, dst_crs) for r in p.interiors]
            polys.append(type(p)(exterior, interiors))
        return type(geom)(polys)
    elif geom.geom_type == "Point":
        xs, ys = rio_transform(src_crs, dst_crs, [geom.x], [geom.y])
        return type(geom)(xs[0], ys[0])
    return geom


def reproject_boundary(boundary: gpd.GeoDataFrame, target_proj4: str) -> gpd.GeoDataFrame:
    """把 boundary GeoDataFrame 重投影到目标 proj4 string"""
    target_crs = CRS.from_string(target_proj4)
    if str(boundary.crs) == str(target_crs):
        return boundary
    src_crs = boundary.crs
    new_geoms = [_reproject_single(g, src_crs, target_crs) for g in boundary.geometry]
    out = boundary.copy()
    out.geometry = gpd.GeoSeries(new_geoms, crs=target_crs)
    return out


def load_hk_boundary() -> gpd.GeoDataFrame:
    """读 HK 18 districts shapefile (.shp + .dbf + .prj + .shx)"""
    if not HK_BOUNDARY_SHP.exists():
        print(f"❌ Shapefile 不存在: {HK_BOUNDARY_SHP}")
        sys.exit(1)
    gdf = gpd.read_file(HK_BOUNDARY_SHP)
    print(f"   边界: {len(gdf)} districts, CRS={gdf.crs}")
    print(f"   columns: {list(gdf.columns)}")
    return gdf


def get_boundary_in_tiff_crs(boundary: gpd.GeoDataFrame, tif_crs):
    """把 boundary 重投影到 tiff 的 CRS。
    注意:tiff 的 CRS 可能是 EPSG:2326 (HK Grid),rasterio CRS.to_proj4() 可能返回空,
    所以直接用我们硬编码的 HK_1980_GRID_PROJ4 string"""
    # 如果 tiff 的 CRS string 等于我们的 HK Grid proj4,认为是 HK Grid
    tif_crs_str = str(tif_crs)
    if "tmerc" in tif_crs_str.lower() or "2326" in tif_crs_str:
        target_proj4 = HK_1980_GRID_PROJ4
    else:
        # fallback: 用 tiff 自带的 proj4
        proj4 = tif_crs.to_proj4() if hasattr(tif_crs, 'to_proj4') else str(tif_crs)
        target_proj4 = proj4 if proj4 else WGS84_PROJ4

    if str(boundary.crs) == target_proj4:
        return boundary
    return reproject_boundary(boundary, target_proj4)


def analyze_values_inside_outside(tif_path: Path, boundary: gpd.GeoDataFrame):
    """诊断:HK 边界内/外的 raster 值分布"""
    print(f"\n🔬  诊�� {tif_path.name}")
    with rasterio.open(tif_path) as src:
        # 先把几何 reproject 到 tiff 的 CRS
        boundary_local = get_boundary_in_tiff_crs(boundary, src.crs)
        geoms = boundary_local.geometry.values.tolist()

        # 用 geometry_mask 直接生成 inside mask (不需要 pyproj)
        mask_inside = geometry_mask(
            geoms,
            out_shape=(src.height, src.width),
            transform=src.transform,
            invert=True,  # True = inside polygon
        )

        data = src.read(1)
        inside_vals = data[mask_inside]
        outside_vals = data[~mask_inside]

        def summarize(arr, name):
            if len(arr) == 0:
                print(f"   {name}: 0 pixels")
                return
            unique, counts = np.unique(arr, return_counts=True)
            top5 = sorted(zip(counts, unique), reverse=True)[:5]
            print(f"   {name}: {len(arr)} pixels")
            print(f"     min={arr.min()} max={arr.max()} unique={len(unique)}")
            print(f"     top values: {[(int(v), int(c)) for c, v in top5]}")

        summarize(inside_vals, "HK 内 (inside)")
        summarize(outside_vals, "HK 外 (outside)")
        return inside_vals, outside_vals


def mask_tif(tif_path: Path, boundary: gpd.GeoDataFrame, out_path: Path):
    """真正的 mask:HK 外像素设为 NaN (nodata),写出新 tiff"""
    print(f"\n📦 处理 {tif_path.name}")

    with rasterio.open(tif_path) as src_obj:
        boundary_local = get_boundary_in_tiff_crs(boundary, src_obj.crs)
        geoms = boundary_local.geometry.values.tolist()

        # 用 geometry_mask 生成 inside mask
        mask_inside = geometry_mask(
            geoms,
            out_shape=(src_obj.height, src_obj.width),
            transform=src_obj.transform,
            invert=True,
        )

        # 转 float32 支持 NaN
        data = src_obj.read().astype("float32")
        data[:, ~mask_inside] = np.nan

        kept = int(mask_inside.sum())
        masked_out = int((~mask_inside).sum())
        total = data.size
        print(f"   HK 内 kept={kept} ({kept/total*100:.1f}%), "
              f"HK 外 NaN={masked_out} ({masked_out/total*100:.1f}%)")

        # 写出 float32 + NaN nodata (GeoServer 渲染透明)
        profile = src_obj.profile.copy()
        profile.update(
            dtype="float32",
            nodata=np.nan,
            compress="lzw",
            tiled=True,
            blockxsize=512,
            blockysize=512,
        )

        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(data)
            dst.update_tags(**src_obj.tags())
            for i in range(1, src_obj.count + 1):
                band_tags = src_obj.tags(i)
                if band_tags:
                    dst.update_tags(i, **band_tags)

        print(f"   ✅ 写出 {out_path.name} ({out_path.stat().st_size/1024:.1f} KB)")
        return True


def upload_to_geoserver(layer_name: str, tif_path: Path) -> bool:
    """上传 masked tiff 到 GeoServer + reconfigure"""
    url = f"{GEOSERVER}/rest/workspaces/{WORKSPACE}/coveragestores/{layer_name}/file.geotiff"
    print(f"   📤 PUT {layer_name} ...")
    with open(tif_path, "rb") as f:
        resp = requests.put(
            url,
            data=f.read(),
            headers={"Content-Type": "image/tiff"},
            auth=HTTPBasicAuth(GEOSERVER_USER, GEOSERVER_PASS),
            timeout=180,
        )
    print(f"      status: {resp.status_code}")
    if resp.status_code not in (200, 201):
        print(f"      ❌ {resp.text[:300]}")
        return False

    reconf_url = (
        f"{GEOSERVER}/rest/workspaces/{WORKSPACE}/coveragestores/"
        f"{layer_name}/coverages/{layer_name}.json?configure=all"
    )
    body = {
        "coverage": {
            "name": layer_name,
            "title": f"Hong Kong {layer_name.replace('HK_', '')} (masked)",
            "abstract": f"{layer_name} - masked to HK administrative boundary",
            "enabled": True,
        }
    }
    reconf_resp = requests.put(
        reconf_url,
        json=body,
        auth=HTTPBasicAuth(GEOSERVER_USER, GEOSERVER_PASS),
        timeout=60,
    )
    print(f"      reconfigure: {reconf_resp.status_code}")
    return True


def main():
    print("=" * 60)
    print("🗺️  HK TIF Mask & Upload to GeoServer")
    print("=" * 60)

    boundary = load_hk_boundary()

    for target in TARGETS:
        tif_path = SOURCE_DIR / target["tif"]
        if not tif_path.exists():
            print(f"❌ {tif_path} 不存在,跳过")
            continue

        analyze_values_inside_outside(tif_path, boundary)

        out_path = OUTPUT_DIR / tif_path.name.replace(".tif", "_masked.tif")
        try:
            if mask_tif(tif_path, boundary, out_path):
                upload_to_geoserver(target["layer"], out_path)
        except Exception as e:
            import traceback
            print(f"❌ {tif_path.name} 失败: {e}")
            traceback.print_exc()
            continue

    print("\n✨ 完成。WMS 验证 URL:")
    for target in TARGETS:
        print(
            f"   {GEOSERVER}/{WORKSPACE}/wms?service=WMS&version=1.1.0&request=GetMap"
            f"&layers={WORKSPACE}:{target['layer']}&bbox=113.83,22.15,114.45,22.56"
            f"&width=512&height=512&srs=EPSG:4326&format=image/png"
        )


if __name__ == "__main__":
    main()