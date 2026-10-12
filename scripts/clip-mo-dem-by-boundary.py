# -*- coding: utf-8 -*-
"""Clip Macau DEM to Macau district boundary polygon using cutline.

Workflow:
1. Download existing DEM from GeoServer (or use local copy)
2. gdalwarp -cutline -crop_to_cutline -dstalpha
3. Upload as new coverage store (avoid overwriting locked file)
4. Update frontend reference from MO_DEM_with_channel -> MO_DEM_TIF_clipped

Why a new file/coverage store:
GeoServer 2.22 has a Windows file-lock bug: PUT to an existing .geotiff that
is referenced by a coverage store fails with "unable to remove existing".
The workaround is to upload to a NEW filename and create a NEW coverage store,
then update the frontend to use the new layer name.
"""
import os
import subprocess
import requests
from requests.auth import HTTPBasicAuth

REMOTE_GS = "http://143.89.22.7:8090/geoserver"
REMOTE_AUTH = HTTPBasicAuth("admin", "geoserver")
WS = "natcat_platform"

OGR2OGR = r"C:\Program Files\QGIS 3.40.10\bin\gdalwarp.exe"
PROJ_LIB = r"C:\Program Files\QGIS 3.40.10\share\proj"
DEST_TIF = r"D:\Nat Cat Platform\UI_system\_mo_dem_clipped.tif"
BOUNDARY_SHP = r"D:\MOData\clean_boundary\boundary.shp"

# Source: original GeoServer resource (WGS84, 5m resolution)
SRC_REMOTE = "data/natcat_platform/MO_DEM_TIF/MO_DEM_TIF.geotiff"
# Destination: NEW filename to avoid file lock
DEST_REMOTE = "data/natcat_platform/MO_DEM_TIF/MO_DEM_TIF_clipped.geotiff"
NEW_COVERAGESTORE = "MO_DEM_TIF_clipped"


def download_dem():
    """Download original DEM from GeoServer."""
    tmp = r"D:\Nat Cat Platform\UI_system\_mo_dem_original.geotiff"
    r = requests.get(
        f"{REMOTE_GS}/rest/resource/{SRC_REMOTE}",
        auth=REMOTE_AUTH, stream=True
    )
    r.raise_for_status()
    with open(tmp, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"Downloaded {os.path.getsize(tmp):,} bytes to {tmp}")
    return tmp


def clip_with_cutline(src_tif):
    """gdalwarp -cutline to clip DEM to boundary polygon."""
    env = os.environ.copy()
    env["PROJ_LIB"] = PROJ_LIB
    cmd = [
        OGR2OGR.replace("ogr2ogr", "gdalwarp"),  # reuse the path slot
        "-ot", "Float32",
        "-of", "GTiff",
        "-co", "COMPRESS=DEFLATE",
        "-co", "TILED=YES",
        "-cutline", BOUNDARY_SHP,
        "-crop_to_cutline",
        "-dstalpha",
        src_tif, DEST_TIF,
    ]
    r = subprocess.run(cmd, capture_output=True, env=env, text=True)
    print(r.stdout[-300:])
    if r.returncode != 0:
        raise RuntimeError(f"gdalwarp failed: {r.stderr}")
    print(f"Clipped DEM: {os.path.getsize(DEST_TIF):,} bytes")


def upload_new():
    """Upload clipped DEM to NEW file, create new coverage store, set style."""
    # 1. PUT to NEW path on GeoServer (raw bytes; PUT overwrites are fine
    #    here because the target file doesn't exist yet).
    with open(DEST_TIF, 'rb') as f:
        data = f.read()
    r = requests.put(
        f"{REMOTE_GS}/rest/resource/{DEST_REMOTE}",
        auth=REMOTE_AUTH, data=data,
        headers={"Content-Type": "image/tiff"},
    )
    print(f"PUT {DEST_REMOTE}: HTTP {r.status_code}")
    r.raise_for_status()

    # 2. Create coverage store
    r = requests.post(
        f"{REMOTE_GS}/rest/workspaces/{WS}/coveragestores",
        auth=REMOTE_AUTH,
        json={
            "coverageStore": {
                "name": NEW_COVERAGESTORE, "type": "GeoTIFF", "enabled": True,
                "workspace": {"name": WS},
                "url": f"file:{DEST_REMOTE}",
            }
        },
        headers={"Content-Type": "application/json"},
    )
    print(f"POST coveragestore: HTTP {r.status_code}")
    if r.status_code not in (200, 201):
        # 409 if already exists - that's OK, we just continue
        if "already exists" in r.text:
            print("  (coverage store already exists, continuing)")
        else:
            raise RuntimeError(r.text)

    # 3. Native publish (creates the layer/coverage automatically)
    r = requests.put(
        f"{REMOTE_GS}/rest/workspaces/{WS}/coveragestores/{NEW_COVERAGESTORE}/file.geotiff?configure=all",
        auth=REMOTE_AUTH, data=data, headers={"Content-Type": "image/tiff"},
    )
    print(f"Publish coverage: HTTP {r.status_code}")
    r.raise_for_status()

    # 4. Set default style
    r = requests.put(
        f"{REMOTE_GS}/rest/layers/{WS}:{NEW_COVERAGESTORE}",
        auth=REMOTE_AUTH,
        json={"layer": {"defaultStyle": {"name": "dem_macau"}, "enabled": True}},
        headers={"Content-Type": "application/json"},
    )
    print(f"Set style: HTTP {r.status_code}")


def cleanup_local():
    for f in [r"D:\Nat Cat Platform\UI_system\_mo_dem_original.geotiff", DEST_TIF]:
        try:
            os.remove(f)
        except OSError:
            pass


def main():
    src = download_dem()
    clip_with_cutline(src)
    upload_new()
    cleanup_local()
    print(f"\n✅ Done. Update frontend WMSTileLayer:")
    print(f'   layers="natcat_platform:{NEW_COVERAGESTORE}"')


if __name__ == "__main__":
    main()