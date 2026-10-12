# -*- coding: utf-8 -*-
"""Publish Macau District Boundary + Statistical Area to GeoServer.

Approach: GeoServer's REST upload endpoint (.../file.shp?configure=all) accepts
a ZIP containing shapefile components and auto-creates datastore + featureType.

Key learnings (after many failed attempts):
1. DO NOT use multipart/form-data for raw file uploads - GeoServer corrupts
   the binary. Use PUT with --data-binary (or requests.put with raw bytes).
2. The shapefile reader's createSchema() rewrites DBF/SHX using temp file swap,
   which fails on Windows when files are stored under rest/resource/. So we
   cannot use POST datastore (JSON) + POST featuretype (JSON) separately.
3. The native file.shp upload endpoint avoids createSchema() entirely.
4. Macau stat.shp uses a non-standard "MacauProj" (Transverse Mercator) - GeoServer
   cannot auto-reproject, so we pre-reproject to WGS84 using ogr2ogr with PROJ_LIB
   pointing to QGIS's proj.db (avoids PostgreSQL's broken proj.db).

Usage:
    python publish-mo-districts-gpkg.py [--reproject]
"""
import argparse
import os
import sys
import zipfile
import io
import requests
from requests.auth import HTTPBasicAuth
import shapefile

REMOTE_GS = "http://143.89.22.7:8090/geoserver"
REMOTE_AUTH = HTTPBasicAuth("admin", "geoserver")
WS = "natcat_platform"

# Macau District Boundary (already WGS84, no reproject needed)
DISTRICT_SRC = r"D:\MOData\clean_boundary"
DISTRICT_BASENAME = "boundary"

# Macau Statistical Area (native CRS is Macau Grid, must pre-reproject to WGS84)
STAT_SRC_NATIVE = r"D:\MOData\clean_stat"
STAT_SRC_WGS84 = r"D:\MOData\stat_wgs84"
STAT_BASENAME = "stat"

OGR2OGR = r"C:\Program Files\QGIS 3.40.10\bin\ogr2ogr.exe"
PROJ_LIB = r"C:\Program Files\QGIS 3.40.10\share\proj"

DISTRICT_BBOX = {
    "minx": 113.5287370435096, "miny": 22.109765649970765,
    "maxx": 113.59822349989278, "maxy": 22.217033682580187,
}
STAT_BBOX = {
    "minx": 113.52873703500282, "miny": 22.109765649970885,
    "maxx": 113.59822621871825, "maxy": 22.21703368528978,
}

DATASETS = [
    {
        "datastore": "MO_DistrictBoundary",
        "layer": "boundary",
        "src_dir": DISTRICT_SRC,
        "basename": DISTRICT_BASENAME,
        "title": "Macau District Boundary (WGS84)",
        "abstract": "Macau administrative district polygons (7 parishes + Cotai)",
        "bbox": DISTRICT_BBOX,
        "needs_reproject": False,
    },
    {
        "datastore": "MO_StatArea",
        "layer": "stat",
        "src_dir": STAT_SRC_NATIVE,
        "wgs84_dir": STAT_SRC_WGS84,
        "basename": STAT_BASENAME,
        "title": "Macau Statistical Area (WGS84)",
        "abstract": "Macau 25 statistical areas with population/density attributes",
        "bbox": STAT_BBOX,
        "needs_reproject": True,
    },
]


def reproject_to_wgs84(src_dir, basename):
    """Use ogr2ogr to reproject Macau Grid -> WGS84. Output: D:/MOData/<basename>_wgs84.shp"""
    wkt_path = "/tmp/macau_grid.wkt"
    if not os.path.exists(wkt_path):
        with open(wkt_path, "w") as f:
            f.write(
                'PROJCS["MacauProj",GEOGCS["GCS_MacauGrid",'
                'DATUM["D_International_1924",SPHEROID["International_1924",6378388.0,297.0]],'
                'PRIMEM["",0.0],UNIT["Degree",0.0174532925199433]],'
                'PROJECTION["Transverse_Mercator"],'
                'PARAMETER["False_Easting",20000.0],'
                'PARAMETER["False_Northing",20000.0],'
                'PARAMETER["Central_Meridian",113.5364694444],'
                'PARAMETER["Scale_Factor",1.0],'
                'PARAMETER["Latitude_Of_Origin",22.2123972222],'
                'UNIT["Meter",1.0]]'
            )

    out_base = f"D:/MOData/{basename}_wgs84"
    env = os.environ.copy()
    env["PROJ_LIB"] = PROJ_LIB
    cmd = [
        OGR2OGR,
        "-s_srs", wkt_path,
        "-t_srs", "EPSG:4326",
        "-f", "ESRI Shapefile",
        f"{out_base}.shp",
        f"{src_dir}.shp",
        "-overwrite",
    ]
    r = subprocess.run(cmd, capture_output=True, env=env, text=True)
    print(f"  ogr2ogr stdout: {r.stdout[:200]}")
    if r.returncode != 0:
        print(f"  ogr2ogr stderr: {r.stderr[:200]}")
        return False
    return True


import subprocess  # noqa: E402


def upload_zip(datastore, layer_name, src_dir, basename, bbox, title, abstract):
    """Upload shapefile bundle via native file.shp endpoint."""
    # Build zip with the basename matching what GeoServer expects for layer name
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_STORED) as zf:
        for ext in ['shp', 'shx', 'dbf', 'prj', 'cpg']:
            local = f"{src_dir}.{ext}"
            if os.path.exists(local):
                zf.write(local, f"{basename}.{ext}")
    zip_data = buf.getvalue()
    print(f"  ZIP size: {len(zip_data)} bytes")

    r = requests.put(
        f"{REMOTE_GS}/rest/workspaces/{WS}/datastores/{datastore}/file.shp?configure=all",
        auth=REMOTE_AUTH,
        data=zip_data,
        headers={"Content-Type": "application/zip"},
    )
    print(f"  Upload: HTTP {r.status_code}")
    if r.status_code not in (200, 201):
        return False

    # Update featureType with full metadata
    ft_body = {
        "featureType": {
            "name": basename,
            "title": title,
            "abstract": abstract,
            "srs": "EPSG:4326",
            "nativeBoundingBox": {**bbox, "crs": "EPSG:4326"},
            "latLonBoundingBox": {**bbox, "crs": "EPSG:4326"},
        }
    }
    r = requests.put(
        f"{REMOTE_GS}/rest/workspaces/{WS}/datastores/{datastore}/featuretypes/{basename}.json",
        auth=REMOTE_AUTH, json=ft_body, headers={"Content-Type": "application/json"}
    )
    print(f"  Update FT: HTTP {r.status_code}")

    # Set default style
    r = requests.put(
        f"{REMOTE_GS}/rest/layers/{WS}:{basename}", auth=REMOTE_AUTH,
        json={"layer": {"defaultStyle": {"name": "polygon"}}},
        headers={"Content-Type": "application/json"}
    )
    print(f"  Style: HTTP {r.status_code}")

    # Verify WMS GetMap
    params = {
        "service": "WMS", "version": "1.1.1", "request": "GetMap",
        "layers": f"{WS}:{basename}",
        "bbox": f"{bbox['minx']},{bbox['miny']},{bbox['maxx']},{bbox['maxy']}",
        "width": 512, "height": 512, "srs": "EPSG:4326", "format": "image/png",
    }
    r = requests.get(f"{REMOTE_GS}/{WS}/wms", params=params, auth=REMOTE_AUTH)
    print(f"  WMS: HTTP {r.status_code}, {len(r.content)} bytes")
    return r.status_code == 200 and len(r.content) > 5000


def cleanup():
    """Delete existing datastores (and their layers)."""
    for ds in DATASETS:
        for layer in [ds["layer"], ds["datastore"]]:
            r = requests.delete(
                f"{REMOTE_GS}/rest/workspaces/{WS}/layers/{layer}.json?recurse=true",
                auth=REMOTE_AUTH
            )
        r = requests.delete(
            f"{REMOTE_GS}/rest/workspaces/{WS}/datastores/{ds['datastore']}.json?recurse=true",
            auth=REMOTE_AUTH
        )
        print(f"  Cleanup {ds['datastore']}: HTTP {r.status_code}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reproject", action="store_true",
                        help="Re-run ogr2ogr reprojection for stat.shp")
    args = parser.parse_args()

    print("=== Cleanup ===")
    cleanup()

    for ds in DATASETS:
        print(f"\n=== {ds['datastore']} ===")
        if ds["needs_reproject"]:
            if args.reproject or not os.path.exists(f"{ds['wgs84_dir']}.shp"):
                print("  Reprojecting Macau Grid -> WGS84...")
                if not reproject_to_wgs84(ds["src_dir"], ds["basename"]):
                    continue
                ds["src_dir"] = ds["wgs84_dir"]
            else:
                print(f"  Using existing WGS84 file: {ds['wgs84_dir']}.shp")
                ds["src_dir"] = ds["wgs84_dir"]

        upload_zip(
            ds["datastore"], ds["layer"],
            ds["src_dir"], ds["basename"],
            ds["bbox"], ds["title"], ds["abstract"],
        )


if __name__ == "__main__":
    main()
