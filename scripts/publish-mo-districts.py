# -*- coding: utf-8 -*-
"""Publish Macau District Boundary + Statistical Area shapefiles to GeoServer.

Two GeoServer instances:
- Local  http://localhost:8080  (file:// D:/MOData/...)
- Remote http://143.89.22.7:8090 (file:rest/resource/mo_shp/... — uploaded via REST PUT)

Reads SHP schema with pyshp (no fiona dependency).
"""
import sys
import requests
from requests.auth import HTTPBasicAuth
from pathlib import Path
import shapefile  # pyshp

# ---- Config ----
LOCAL_GS = "http://localhost:8080/geoserver"
REMOTE_GS = "http://143.89.22.7:8090/geoserver"
LOCAL_AUTH = HTTPBasicAuth("chensi", "CSma19921020~!")
REMOTE_AUTH = HTTPBasicAuth("admin", "geoserver")
WS = "natcat_platform"

# Datasets to publish: (shp_path, datastore_name, layer_name, title, abstract, style, native_srs_or_None)
DATASETS = [
    {
        "shp_local": r"D:\MOData\district\district\district_boundary.shp",
        "shp_remote": "file:rest/resource/mo_shp/district_boundary/district_boundary.shp",
        "datastore": "MO_DistrictBoundary",
        "layer": "MO_DistrictBoundary",
        "title": "Macau District Boundary (WGS84)",
        "abstract": "Macau administrative district polygons (7 parishes + Cotai reclamation)",
        "style": "polygon",
        "srs": "EPSG:4326",
        "bbox": (113.5287370435096, 22.109765649970765, 113.59822349989278, 22.217033682580187),
    },
    {
        "shp_local": r"D:\MOData\district\stat_area\stat_area.shp",
        "shp_remote": "file:rest/resource/mo_shp/stat_area/stat_area.shp",
        "datastore": "MO_StatArea",
        "layer": "MO_StatArea",
        "title": "Macau Statistical Area (Macau Grid)",
        "abstract": "Macau 25 statistical areas with population/density attributes (ZONA, POPULATION, DENSITY, FLAT_SUM, ELDERLY)",
        "style": "polygon",
        # Native Macau Grid: not standard EPSG, GeoServer will auto-reproject
        "srs": "EPSG:4326",
    },
]

# pyshp shape type -> GeoServer Java geometry binding
GEOM_BINDINGS = {
    0: "com.vividsolutions.jts.geom.Geometry",
    1: "com.vividsolutions.jts.geom.Point",
    3: "com.vividsolutions.jts.geom.LineString",
    5: "com.vividsolutions.jts.geom.Polygon",
    8: "com.vividsolutions.jts.geom.MultiPoint",
    11: "com.vividsolutions.jts.geom.Point",
    13: "com.vividsolutions.jts.geom.LineString",
    15: "com.vividsolutions.jts.geom.Polygon",
    18: "com.vividsolutions.jts.geom.MultiPoint",
    23: "com.vividsolutions.jts.geom.LineString",
    25: "com.vividsolutions.jts.geom.Polygon",
    28: "com.vividsolutions.jts.geom.MultiPoint",
    31: "com.vividsolutions.jts.geom.MultiPolygon",
}

# DBF field type -> Java binding
DBF_TYPE_MAP = {
    "C": "java.lang.String",
    "N": "java.lang.Double",
    "F": "java.lang.Double",
    "L": "java.lang.String",
    "D": "java.util.Date",
    "M": "java.lang.String",
}


def read_schema(shp_path):
    """Read SHP schema with pyshp. Returns (geom_binding, attributes)."""
    sf = shapefile.Reader(shp_path)
    geom_binding = GEOM_BINDINGS.get(sf.shapeType, "com.vividsolutions.jts.geom.Geometry")
    attributes = [{"name": "the_geom", "binding": geom_binding}]
    for fld in sf.fields[1:]:  # skip deletion flag
        name, ftype, size, dec = fld[0], fld[1], fld[2], fld[3]
        if name.lower() == 'shape' or name == '':
            continue
        binding = DBF_TYPE_MAP.get(ftype, "java.lang.String")
        attributes.append({"name": name, "binding": binding})
    return geom_binding, attributes


def cleanup(gs, auth, datastore, layer):
    """Delete existing layer and datastore if they exist."""
    requests.delete(f"{gs}/rest/workspaces/{WS}/layers/{layer}.json?recurse=true", auth=auth)
    requests.delete(f"{gs}/rest/workspaces/{WS}/datastores/{datastore}.json?recurse=true", auth=auth)


def create_datastore_local(gs, auth, ds, shp_path, charset="UTF-8"):
    """Local: file:///D:/MOData/..."""
    file_url = "file:///" + str(Path(shp_path)).replace("\\", "/")
    body = {
        "dataStore": {
            "name": ds["datastore"],
            "type": "Shapefile",
            "enabled": True,
            "workspace": {"name": WS},
            "connectionParameters": {
                "entry": [
                    {"@key": "url", "$": file_url},
                    {"@key": "charset", "$": charset},
                    {"@key": "dbtype", "$": "shapefile"},
                ]
            },
        }
    }
    r = requests.post(f"{gs}/rest/workspaces/{WS}/datastores", auth=auth, json=body,
                      headers={"Content-Type": "application/json"})
    return r.status_code, r.text


def create_datastore_remote(gs, auth, ds):
    """Remote: file:rest/resource/mo_shp/.../foo.shp (uploaded via PUT)"""
    body = {
        "dataStore": {
            "name": ds["datastore"],
            "type": "Shapefile",
            "enabled": True,
            "workspace": {"name": WS},
            "connectionParameters": {
                "entry": [
                    {"@key": "url", "$": ds["shp_remote"]},
                    {"@key": "charset", "$": "UTF-8"},
                    {"@key": "dbtype", "$": "shapefile"},
                ]
            },
        }
    }
    r = requests.post(f"{gs}/rest/workspaces/{WS}/datastores", auth=auth, json=body,
                      headers={"Content-Type": "application/json"})
    return r.status_code, r.text


def create_featuretype(gs, auth, ds, attributes):
    body = {
        "featureType": {
            "name": ds["layer"],
            "title": ds["title"],
            "abstract": ds["abstract"],
            "enabled": True,
            "srs": ds["srs"],
            "attributes": {"attribute": attributes},
        }
    }
    if "bbox" in ds:
        b = ds["bbox"]
        body["featureType"]["nativeBoundingBox"] = {
            "minx": b[0], "miny": b[1], "maxx": b[2], "maxy": b[3], "crs": ds["srs"]
        }
        body["featureType"]["latLonBoundingBox"] = {
            "minx": b[0], "miny": b[1], "maxx": b[2], "maxy": b[3], "crs": ds["srs"]
        }
    r = requests.post(
        f"{gs}/rest/workspaces/{WS}/datastores/{ds['datastore']}/featuretypes?configure=all",
        auth=auth, json=body, headers={"Content-Type": "application/json"}
    )
    return r.status_code, r.text


def set_style(gs, auth, layer_name, style):
    body = {"layer": {"defaultStyle": {"name": style}}}
    r = requests.put(f"{gs}/rest/layers/{WS}:{layer_name}", auth=auth, json=body,
                     headers={"Content-Type": "application/json"})
    return r.status_code, r.text


def publish_one(gs, auth, ds, shp_path, is_local):
    """Publish a single dataset. Returns True on success."""
    print(f"\n--- {gs} ---")
    print(f"  Datastore: {ds['datastore']}")
    print(f"  Layer:     {ds['layer']}")

    # 1. Cleanup
    cleanup(gs, auth, ds["datastore"], ds["layer"])

    # 2. Read schema (uses local shp path on either side)
    geom_binding, attributes = read_schema(shp_path)
    print(f"  Schema:    geom={geom_binding.split('.')[-1]}, {len(attributes)-1} attrs")

    # 3. Create datastore
    if is_local:
        status, text = create_datastore_local(gs, auth, ds, shp_path)
    else:
        status, text = create_datastore_remote(gs, auth, ds)
    print(f"  Datastore: HTTP {status}")
    if status not in (200, 201):
        print(f"    ERROR: {text[:300]}")
        return False

    # 4. Create featuretype with attributes
    status, text = create_featuretype(gs, auth, ds, attributes)
    print(f"  FeatureType: HTTP {status}")
    if status not in (200, 201):
        print(f"    ERROR: {text[:300]}")
        return False

    # 5. Set style
    status, text = set_style(gs, auth, ds["layer"], ds["style"])
    print(f"  Style ({ds['style']}): HTTP {status}")

    return True


def verify_wms(gs, auth, layer, bbox):
    """Quick WMS GetMap test."""
    params = {
        "service": "WMS", "version": "1.1.1", "request": "GetMap",
        "layers": f"{WS}:{layer}",
        "bbox": f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        "width": 256, "height": 256, "srs": "EPSG:4326", "format": "image/png",
    }
    r = requests.get(f"{gs}/{WS}/wms", params=params, auth=auth)
    print(f"  WMS GetMap: HTTP {r.status_code}, {len(r.content)} bytes")
    return r.status_code == 200


if __name__ == "__main__":
    targets = []
    if "--local" in sys.argv or len(sys.argv) == 1:
        targets.append(("LOCAL 8080", LOCAL_GS, LOCAL_AUTH, True))
    if "--remote" in sys.argv or len(sys.argv) == 1:
        targets.append(("REMOTE 8090", REMOTE_GS, REMOTE_AUTH, False))

    ok_count = 0
    fail_count = 0

    for label, gs, auth, is_local in targets:
        print(f"\n========== {label} ({gs}) ==========")
        for ds in DATASETS:
            if publish_one(gs, auth, ds, ds["shp_local"], is_local):
                # Verify
                bbox = ds.get("bbox", (113.528, 22.105, 113.6, 22.218))
                if verify_wms(gs, auth, ds["layer"], bbox):
                    ok_count += 1
                else:
                    fail_count += 1
            else:
                fail_count += 1

    print(f"\n========== Summary ==========")
    print(f"OK: {ok_count}, FAIL: {fail_count}")