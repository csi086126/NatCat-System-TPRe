"""
上传 13 个澳门 LULC layer (Project 重投影后的 WGS84 版本) 到 GeoServer。
- 删除旧的 LULC datastore + layer
- 创建新的 MO_{layer}_project_wgs84 datastore
- 创建 MO_{layer}_project_WGS84 featuretype (从 DBF 读取 attributes)
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
# 已转换的 WGS84 shapefile 文件
DATA_ROOT = "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_full"

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


def get_dbf_attributes(shp_path):
    """通过 ogrinfo subprocess 读取 shapefile 字段和几何类型 (避免 pyshp 路径问题)"""
    ogrinfo = r"C:\Users\sichen\AppData\Local\anaconda3\envs\geo_env\Library\bin\ogrinfo.exe"
    out = subprocess.check_output(
        [ogrinfo, "-so", "-al", shp_path],
        stderr=subprocess.STDOUT,
    ).decode("utf-8", errors="replace")

    # 解析字段: ogrinfo 输出中以 "FIELD: Type (width.dec)" 格式
    # 例如: "  Id: Integer (9.0)"  或  "  CNAME: String (40.0)"
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

    # 几何类型
    geom_re = re.search(r"Geometry:\s+(\w+)", out)
    geom_name = geom_re.group(1) if geom_re else ""
    geom_map = {
        "Point": "org.locationtech.jts.geom.Point",
        "LineString": "org.locationtech.jts.geom.MultiLineString",
        "Polygon": "org.locationtech.jts.geom.MultiPolygon",
        "MultiPoint": "org.locationtech.jts.geom.MultiPoint",
        "MultiLineString": "org.locationtech.jts.geom.MultiLineString",
        "MultiPolygon": "org.locationtech.jts.geom.MultiPolygon",
        "Geometry Collection": "org.locationtech.jts.geom.GeometryCollection",
    }
    geom_binding = geom_map.get(geom_name, "org.locationtech.jts.geom.Geometry")

    attrs = []
    for m in field_re.finditer(out):
        name, ftype = m.group(1), m.group(2)
        if name == "DeletionFlag":
            continue
        binding = type_map.get(ftype, "java.lang.String")
        attrs.append({"name": name, "binding": binding})

    # 添加 the_geom
    attrs.append({"name": "the_geom", "binding": geom_binding})
    return attrs


def create_datastore(ds_name, layer_dir):
    body = {
        "dataStore": {
            "name": ds_name,
            "connectionParameters": {
                "entry": [
                    {"@key": "dbtype", "$": "shp"},
                    {"@key": "url", "$": f"file:{DATA_ROOT}/{layer_dir}/{layer_dir}.shp"},
                    {"@key": "namespace", "$": WS},
                    {"@key": "create spatial index", "$": "true"},
                ]
            }
        }
    }
    return req("POST", f"/rest/workspaces/{WS}/datastores", body)


def create_featuretype(ds_name, ft_name, attributes):
    """创建 featuretype，attributes 不能为空，CRS 从 .prj 自动 derive"""
    body = {
        "featureType": {
            "name": ft_name,
            "srs": "EPSG:4326",
            "nativeCRS": "EPSG:4326",
            "enabled": True,
            "attributes": {"attribute": attributes},
        }
    }
    return req("POST", f"/rest/workspaces/{WS}/datastores/{ds_name}/featuretypes",
               body, params={"recalculate": "nativebbox,latlonbbox"})


# ==== Step 1: 清理旧的 datastore + layer ====
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

    # layer
    if exists(f"/rest/workspaces/{WS}/layers/{layer_name}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/layers/{layer_name}?recurse=true")
        print(f"  DELETE layer {layer_name}: {code}")
    # datastore
    if exists(f"/rest/workspaces/{WS}/datastores/{ds}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/datastores/{ds}?recurse=true")
        print(f"  DELETE datastore {ds}: {code}")

# ==== Step 2: 创建新 datastore + featuretype ====
print()
print("=" * 60)
print("Step 2: 创建 13 个 LULC datastore + featuretype")
print("=" * 60)
results = []
for layer in LAYERS:
    ds_name = f"MO_{layer}_project_wgs84"
    ft_name = f"MO_{layer}_project_WGS84"
    shp_path = f"{DATA_ROOT}/{layer}/{layer}.shp".replace("/", "\\")

    print(f"\n[{layer}]")
    code, text = create_datastore(ds_name, layer)
    print(f"  CREATE datastore {ds_name}: HTTP {code}")
    if code not in (201,):
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "datastore", code))
        continue

    # 从 DBF 读 attributes
    try:
        attributes = get_dbf_attributes(shp_path)
        print(f"  DBF attributes: {[a['name'] for a in attributes]}")
    except Exception as e:
        print(f"  ERROR reading DBF: {e}")
        results.append((layer, "dbf", 0))
        continue

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
