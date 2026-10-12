"""只上传 10 个 Polygon layer (lake, lote, monte, place, ponte, predio, rua, terra, tower, verde)"""
import io
import sys
import re
import subprocess
import requests
from requests.auth import HTTPBasicAuth

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

GEOSERVER = "http://10.253.22.15:8080/geoserver"
AUTH = HTTPBasicAuth("chensi", "CSma19921020~!")
WS = "natcat_platform"
DS_BASE = "C:/ProgramData/GeoServer/data/natcat_platform"

LAYERS = [
    "lake", "lote", "monte", "place", "ponte",
    "predio", "rua", "terra", "tower", "verde",
]


def req(method, path, json_body=None, params=None):
    r = requests.request(method, f"{GEOSERVER}{path}", auth=AUTH,
                         json=json_body, params=params or {})
    return r.status_code, r.text


def get_attributes_from_shp(shp_path):
    """用 .dbf header 直接读字段, ogrinfo 输出格式不可靠"""
    import struct
    dbf_path = shp_path.replace(".shp", ".dbf")

    # DBF type to Java binding
    type_map = {
        "C": "java.lang.String",
        "N": "java.lang.Double",
        "F": "java.lang.Double",
        "L": "java.lang.Boolean",
        "D": "java.sql.Date",
        "M": "java.lang.String",
    }

    with open(dbf_path, "rb") as f:
        header = f.read(32)
        f.seek(32)
        attrs = []
        while True:
            fd = f.read(32)
            if fd[0:1] == b"\r":
                break
            name = fd[:11].split(b"\x00")[0].decode("latin1").strip()
            ftype = chr(fd[11])
            fdec = fd[17]
            if name == "DeletionFlag":
                continue
            if ftype == "N" and fdec == 0:
                binding = "java.lang.Integer"
            else:
                binding = type_map.get(ftype, "java.lang.String")
            attrs.append({"name": name, "binding": binding})

    # 几��类型: 读 .shp header
    with open(shp_path, "rb") as f:
        f.seek(0)
        shp_header = f.read(100)
    # ShapeType 在 offset 32 (little-endian int32)
    shape_type = struct.unpack("<I", shp_header[32:36])[0]
    geom_map = {
        0: "org.locationtech.jts.geom.Geometry",     # Null
        1: "org.locationtech.jts.geom.Point",         # Point
        3: "org.locationtech.jts.geom.MultiLineString",  # PolyLine
        5: "org.locationtech.jts.geom.MultiPolygon",     # Polygon
        8: "org.locationtech.jts.geom.MultiPoint",       # MultiPoint
        11: "org.locationtech.jts.geom.Point",          # PointZ
        13: "org.locationtech.jts.geom.MultiLineString", # PolyLineZ
        15: "org.locationtech.jts.geom.MultiPolygon",    # PolygonZ
    }
    geom_binding = geom_map.get(shape_type, "org.locationtech.jts.geom.Geometry")

    attrs.append({"name": "the_geom", "binding": geom_binding})
    return attrs


def create_shp_datastore(ds_name, dest_dir):
    """URL 指向 GeoServer data_dir 内的目录"""
    body = {
        "dataStore": {
            "name": ds_name, "type": "Shapefile",
            "connectionParameters": {
                "entry": [
                    {"@key": "charset", "$": "UTF-8"},
                    {"@key": "namespace", "$": "http://natcat.platform/geoserver"},
                    {"@key": "url", "$": f"file:{dest_dir}/"},
                ]
            }
        }
    }
    return req("POST", f"/rest/workspaces/{WS}/datastores", body)


def create_featuretype(ds_name, ft_name, attributes):
    body = {"featureType": {
        "name": ft_name, "srs": "EPSG:4326",
        "attributes": {"attribute": attributes}}}
    return req("POST", f"/rest/workspaces/{WS}/datastores/{ds_name}/featuretypes",
               body, params={"recalculate": "nativebbox,latlonbbox"})


results = []
for layer in LAYERS:
    ds_name = f"MO_{layer}_project_wgs84"
    ft_name = f"MO_{layer}_project_WGS84"
    dest_dir = f"{DS_BASE}/MO_{layer}_v2_wgs84"
    shp_path = f"{dest_dir}/{layer}.shp".replace("/", "\\")
    print(f"\n[{layer}]")

    code, text = create_shp_datastore(ds_name, dest_dir)
    print(f"  datastore: HTTP {code}")
    if code != 201:
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "ds", code))
        continue

    try:
        attributes = get_attributes_from_shp(shp_path)
        print(f"  attrs: {[a['name'] for a in attributes]}")
    except Exception as e:
        print(f"  DBF err: {e}")
        results.append((layer, "dbf", 0))
        continue

    code, text = create_featuretype(ds_name, ft_name, attributes)
    print(f"  featuretype: HTTP {code}")
    if code != 201:
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "ft", code))
        continue
    results.append((layer, "OK", 201))

print("\n=== Summary ===")
for layer, stage, code in results:
    print(f"  {'✓' if stage == 'OK' else '✗'} {layer} [{stage}] HTTP {code}")