"""Fix MO LULC layers: force reproject to WGS84, write proper .prj, re-upload."""
import warnings; warnings.filterwarnings('ignore')
import sys, os, zipfile, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
from requests.auth import HTTPBasicAuth
import geopandas as gpd
from shapely.validation import make_valid
from shapely.geometry import Point
from shapely import set_coordinates, get_coordinates
import numpy as np

# Macau local CRS proj4 (Observatorio 1965 Macau Grid)
MACAU_LOCAL_PROJ = (
    "+proj=tmerc +lat_0=22.2123972222222 +lon_0=113.536469444444 "
    "+k=1 +x_0=20000 +y_0=20000 +ellps=intl +units=m +no_defs"
)
WGS84_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'

BASE = Path(r"D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據\下墊面數據For_TAIPINGRE\土地利用\CDROM_C")

# 14 original layers (folder, shp_basename, layer_name, geom)
LAYERS = [
    ("boundary", "boundary", "MO_boundary", "polyline"),
    ("centerline", "centerline", "MO_centerline", "polyline"),
    ("doorNo", "doorNo", "MO_doorNo", "polyline"),
    ("lake", "lake", "MO_lake", "polygon"),
    ("lote", "lote", "MO_lote", "polygon"),
    ("monte", "monte", "MO_monte", "polygon"),
    ("place", "place", "MO_place", "point"),
    ("ponte", "ponte", "MO_ponte", "polygon"),
    ("predio", "predio", "MO_predio", "polygon"),
    ("rua", "rua", "MO_rua", "polygon"),
    ("terra", "terra", "MO_terra", "polygon"),
    ("tower", "tower", "MO_tower", "polygon"),
    ("verde", "verde", "MO_verde", "polygon"),
    ("xinqiao", "xinqiao", "MO_xinqiao", "polyline"),
]

SERVERS = [
    ("external", "http://143.89.22.7:8090/geoserver", "admin", "geoserver"),
    ("internal", "http://10.253.22.15:8080/geoserver", "chensi", "CSma19921020~!"),
]


def fix_and_reproject(folder_name, shp_name):
    """Force-reproject .shp to WGS84, write proper .prj, return (gdf, zip_path)."""
    if folder_name == "xinqiao":
        folder = BASE / "monte"
    else:
        folder = BASE / folder_name
    shp_path = folder / f"{shp_name}.shp"
    if not shp_path.exists():
        return None, None

    kw = {"on_invalid": "ignore"}
    if shp_name == "centerline":
        kw["encoding"] = "gbk"
    gdf = gpd.read_file(shp_path, **kw)

    if gdf.crs is None:
        # assume Macau local (validated by bounds 18000-26000)
        gdf = gdf.set_crs(MACAU_LOCAL_PROJ, allow_override=True)

    # force reproject to WGS84
    if str(gdf.crs).upper() != "EPSG:4326" and "WGS_84" not in str(gdf.crs).upper():
        gdf = gdf.to_crs("EPSG:4326")

    # overwrite .shp (with retry for file-lock)
    for attempt in range(5):
        try:
            gdf.to_file(shp_path, encoding="utf-8")
            break
        except PermissionError:
            print(f"  retry {attempt+1}: file locked, waiting...")
            time.sleep(2)
    else:
        raise RuntimeError(f"Failed to write {shp_path} after retries")

    # explicitly write .prj (WGS84 WKT) — geopandas may not write it for some files
    prj_path = shp_path.with_suffix(".prj")
    prj_path.write_text(WGS84_PRJ, encoding="utf-8")

    # verify
    gdf2 = gpd.read_file(shp_path, on_invalid="ignore")
    assert str(gdf2.crs).startswith("EPSG:4326") or "WGS_84" in str(gdf2.crs), f"CRS not WGS84: {gdf2.crs}"

    # create zip
    zip_path = folder / f"{shp_name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for ext in [".shp", ".shx", ".dbf", ".prj", ".cpg"]:
            f = shp_path.with_suffix(ext)
            if f.exists():
                zf.write(f, arcname=f"{shp_name}{ext}")
    print(f"  [FIXED] {shp_name}: bbox={gdf2.total_bounds}, crs={gdf2.crs}")
    return gdf2, zip_path


def upload_to(gs_url, gs_user, gs_pass, layer_name, zip_path):
    auth = HTTPBasicAuth(gs_user, gs_pass)
    r = requests.delete(
        f"{gs_url}/rest/workspaces/natcat_platform/datastores/{layer_name}.json?recurse=true",
        auth=auth,
    )
    print(f"  delete {layer_name}: {r.status_code}")
    time.sleep(0.3)
    with open(zip_path, "rb") as f:
        r = requests.put(
            f"{gs_url}/rest/workspaces/natcat_platform/datastores/{layer_name}/file.shp",
            auth=auth,
            params={"configure": "all"},
            headers={"Content-Type": "application/zip"},
            data=f.read(), timeout=180,
        )
    print(f"  upload {layer_name}: {r.status_code}")
    return r.status_code in (200, 201)


def build_composite_wgs84():
    """Re-build composite from corrected WGS84 originals."""
    import sys as _s
    _s.path.insert(0, str(Path(__file__).resolve().parent))
    from upload_macau_lulc_to_geoserver import build_composite_shapefile, COMPOSITE_LAYER_NAME
    return build_composite_shapefile(BASE, BASE / "_composite"), COMPOSITE_LAYER_NAME


# Step 0: Delete all 14 + composite datastores from both servers (release file lock)
print("=" * 70)
print("Step 0: Delete datastores to release file locks")
print("=" * 70)
for label, url, user, pwd in SERVERS:
    auth = HTTPBasicAuth(user, pwd)
    print(f"\n[{label}] deleting MO_* stores...")
    for folder, shp, store, geom in LAYERS:
        r = requests.delete(
            f"{url}/rest/workspaces/natcat_platform/datastores/{store}.json?recurse=true",
            auth=auth,
        )
        if r.status_code == 200:
            print(f"  delete {store}: OK")
        elif r.status_code == 404:
            pass  # not exists
    # also composite
    requests.delete(f"{url}/rest/workspaces/natcat_platform/datastores/MO_LandUse_Composite.json?recurse=true", auth=auth)

print("\nWaiting 5s for file handles to release...")
import time as _t; _t.sleep(5)

# Step 1: Fix all 14 layers (force reproject to WGS84, write .prj)
print("\n" + "=" * 70)
print("Step 1: Force reproject 14 layers to WGS84 + write .prj")
print("=" * 70)
for folder, shp, store, geom in LAYERS:
    gdf, zp = fix_and_reproject(folder, shp)
    if zp:
        # Step 2: Upload to both servers
        for label, url, user, pwd in SERVERS:
            print(f"\n[{label}] {store}")
            upload_to(url, user, pwd, store, zp)

# Step 3: Rebuild + upload composite
print("\n" + "=" * 70)
print("Step 3: Rebuild MO_LandUse_Composite from corrected WGS84 layers")
print("=" * 70)
comp_zip, comp_name = build_composite_wgs84()
for label, url, user, pwd in SERVERS:
    print(f"\n[{label}] {comp_name}")
    upload_to(url, user, pwd, comp_name, comp_zip)