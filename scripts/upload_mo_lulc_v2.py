"""
上传 13 个 LULC layer (Shapefile) 到 GeoServer。
- .shp 已通过 ogr2ogr 放到 C:/ProgramData/GeoServer/data/natcat_platform/MO_{layer}_project_wgs84/
- datastore URL 指向 GeoServer data_dir 内的目录 (GeoServer 会管理文件)
- featuretype 用 the_geom + 自动 derive attributes (从 .shp)
"""
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
# 指向 GeoServer 自己的 data_dir (GeoServer 不会改写源文件)
DS_BASE = "C:/ProgramData/GeoServer/data/natcat_platform"

LAYERS = [
    "boundary", "centerline", "doorNo", "lake", "lote", "monte",
    "place", "ponte", "predio", "rua", "terra", "tower", "verde",
]

OLD_LULC_DATASTORES = [
    "MO_boundary", "MO_centerline", "MO_doorNo", "MO_lake", "MO_lote",
    "MO_monte", "MO_place", "MO_ponte", "MO_predio", "MO_rua", "MO_terra",
    "MO_tower", "MO_verde", "MO_xinqiao",
    "MO_boundary_wgs84",
    "MO_predio_project_wgs84",
]


def req(method, path, json_body=None, params=None):
    r = requests.request(method, f"{GEOSERVER}{path}", auth=AUTH,
                         json=json_body, params=params or {})
    return r.status_code, r.text


def exists(path):
    return req("GET", path)[0] == 200


def create_shp_datastore(ds_name, dest_dir):
    body = {
        "dataStore": {
            "name": ds_name,
            "type": "Shapefile",
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


def get_attributes_from_shp(shp_path):
    """用 ogrinfo 读字段和几何类型"""
    ogrinfo = r"C:\Users\sichen\AppData\Local\anaconda3\envs\geo_env\Library\bin\ogrinfo.exe"
    out = subprocess.check_output(
        [ogrinfo, "-so", "-al", shp_path],
        stderr=subprocess.STDOUT,
    ).decode("utf-8", errors="replace")

    field_re = re.compile(r"^\s+(\w+):\s+(\w+)\s*\(", re.MULTILINE)
    type_map = {
        "Integer": "java.lang.Integer",
        "Integer64": "java.lang.Long",
        "Real": "java.lang.Double",
        "String": "java.lang.String",
        "Date": "java.sql.Date",
        "Time": "java.sql.Time",
        "DateTime": "java.sql.Timestamp",
        "Binary": "byte[]",
    }

    geom_re = re.search(r"Geometry:\s+(\w+(?:\s+\w+)?)", out)
    geom_name = geom_re.group(1) if geom_re else ""
    geom_map = {
        "Point": "org.locationtech.jts.geom.Point",
        "Line String": "org.locationtech.jts.geom.MultiLineString",
        "LineString": "org.locationtech.jts.geom.MultiLineString",
        "Polygon": "org.locationtech.jts.geom.MultiPolygon",
        "Multi Point": "org.locationtech.jts.geom.MultiPoint",
        "MultiPoint": "org.locationtech.jts.geom.MultiPoint",
        "Multi Line String": "org.locationtech.jts.geom.MultiLineString",
        "MultiLineString": "org.locationtech.jts.geom.MultiLineString",
        "Multi Polygon": "org.locationtech.jts.geom.MultiPolygon",
        "MultiPolygon": "org.locationtech.jts.geom.MultiPolygon",
    }
    geom_binding = geom_map.get(geom_name, "org.locationtech.jts.geom.Geometry")

    attrs = []
    for m in field_re.finditer(out):
        name, ftype = m.group(1), m.group(2)
        if name == "DeletionFlag":
            continue
        binding = type_map.get(ftype, "java.lang.String")
        attrs.append({"name": name, "binding": binding})

    attrs.append({"name": "the_geom", "binding": geom_binding})
    return attrs


def create_featuretype(ds_name, ft_name, attributes):
    body = {
        "featureType": {
            "name": ft_name,
            "srs": "EPSG:4326",
            "attributes": {"attribute": attributes},
        }
    }
    return req("POST", f"/rest/workspaces/{WS}/datastores/{ds_name}/featuretypes",
               body, params={"recalculate": "nativebbox,latlonbbox"})


# ==== Step 1: 清理旧的 LULC datastore + layer ====
print("=" * 60)
print("Step 1: 删除旧的 LULC datastore + layer")
print("=" * 60)
for ds in OLD_LULC_DATASTORES:
    if ds == "MO_boundary_wgs84":
        layer_name = "MO_boundary_WGS84"
    elif ds == "MO_predio_project_wgs84":
        layer_name = "MO_predio_project_WGS84"
    else:
        layer_name = ds

    if exists(f"/rest/workspaces/{WS}/layers/{layer_name}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/layers/{layer_name}?recurse=true")
        print(f"  DELETE layer {layer_name}: {code}")
    if exists(f"/rest/workspaces/{WS}/datastores/{ds}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/datastores/{ds}?recurse=true")
        print(f"  DELETE datastore {ds}: {code}")


# ==== Step 2: 创建 datastore + featuretype ====
print()
print("=" * 60)
print("Step 2: 创建 13 个 Shapefile datastore + featuretype")
print("=" * 60)
results = []
for layer in LAYERS:
    ds_name = f"MO_{layer}_project_wgs84"
    ft_name = f"MO_{layer}_project_WGS84"
    dest_dir = f"{DS_BASE}/{ds_name}"

    print(f"\n[{layer}]")

    # 创建 datastore (URL 指向 GeoServer data_dir 内)
    code, text = create_shp_datastore(ds_name, dest_dir)
    print(f"  CREATE datastore {ds_name}: HTTP {code}")
    if code not in (201,):
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "datastore", code))
        continue

    # 读取 attributes
    shp_path = f"{dest_dir}/{layer}.shp".replace("/", "\\")
    try:
        attributes = get_attributes_from_shp(shp_path)
        print(f"  attributes: {[a['name'] for a in attributes]}")
    except Exception as e:
        print(f"  ERROR reading shp: {e}")
        results.append((layer, "dbf", 0))
        continue

    # 创建 featuretype
    code, text = create_featuretype(ds_name, ft_name, attributes)
    print(f"  CREATE featuretype {ft_name}: HTTP {code}")
    if code not in (201,):
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "featuretype", code))
        continue

    results.append((layer, "OK", 201))

print()
print("=" * 60)
print("Summary")
print("=" * 60)
for layer, stage, code in results:
    icon = "✓" if stage == "OK" else "✗"
    print(f"  {icon} {layer}  [{stage}] HTTP {code}")