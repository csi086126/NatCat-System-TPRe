"""
上传 13 个 LULC layer (GeoJSON 格式) 到 GeoServer。
- 不使用 Shapefile datastore (因为 GeoServer 会改写源 .shp 文件)
- 使用 GeoJSON datastore 指向 GeoJSON 文件 (GeoServer 不会改写)
"""
import io
import sys
import requests
from requests.auth import HTTPBasicAuth

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

GEOSERVER = "http://10.253.22.15:8080/geoserver"
AUTH = HTTPBasicAuth("chensi", "CSma19921020~!")
WS = "natcat_platform"
DATA_ROOT = "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_geojson"

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
    "MO_boundary_project_wgs84", "MO_centerline_project_wgs84",
    "MO_doorNo_project_wgs84", "MO_lake_project_wgs84", "MO_lote_project_wgs84",
    "MO_monte_project_wgs84", "MO_place_project_wgs84", "MO_ponte_project_wgs84",
    "MO_predio_project_wgs84", "MO_rua_project_wgs84", "MO_terra_project_wgs84",
    "MO_tower_project_wgs84", "MO_verde_project_wgs84",
]


def req(method, path, json_body=None, headers=None, params=None):
    h = {"Accept": "application/json"}
    if headers:
        h.update(headers)
    r = requests.request(method, f"{GEOSERVER}{path}", auth=AUTH,
                         json=json_body, headers=h, params=params or {})
    return r.status_code, r.text


def exists(path):
    return req("GET", path)[0] == 200


def create_geojson_datastore(ds_name, layer_dir):
    """创建 GeoJSON datastore"""
    body = {
        "dataStore": {
            "name": ds_name,
            "type": "GeoJSON",
            "connectionParameters": {
                "entry": [
                    {"@key": "dbtype", "$": "GeoJSON"},
                    {"@key": "url", "$": f"file:{DATA_ROOT}/{layer_dir}/{layer_dir}.geojson"},
                    {"@key": "namespace", "$": "http://natcat.platform/geoserver"},
                ]
            }
        }
    }
    return req("POST", f"/rest/workspaces/{WS}/datastores", body)


def create_featuretype(ds_name, ft_name):
    """GeoJSON datastore 自动 derive attributes, 只需指定 srs"""
    body = {"featureType": {"name": ft_name, "srs": "EPSG:4326"}}
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
    elif ds == "MO_boundary_project_wgs84":
        layer_name = "MO_boundary_project_WGS84"
    elif ds == "MO_centerline_project_wgs84":
        layer_name = "MO_centerline_project_WGS84"
    elif ds == "MO_doorNo_project_wgs84":
        layer_name = "MO_doorNo_project_WGS84"
    elif ds == "MO_lake_project_wgs84":
        layer_name = "MO_lake_project_WGS84"
    elif ds == "MO_lote_project_wgs84":
        layer_name = "MO_lote_project_WGS84"
    elif ds == "MO_monte_project_wgs84":
        layer_name = "MO_monte_project_WGS84"
    elif ds == "MO_place_project_wgs84":
        layer_name = "MO_place_project_WGS84"
    elif ds == "MO_ponte_project_wgs84":
        layer_name = "MO_ponte_project_WGS84"
    elif ds == "MO_rua_project_wgs84":
        layer_name = "MO_rua_project_WGS84"
    elif ds == "MO_terra_project_wgs84":
        layer_name = "MO_terra_project_WGS84"
    elif ds == "MO_tower_project_wgs84":
        layer_name = "MO_tower_project_WGS84"
    elif ds == "MO_verde_project_wgs84":
        layer_name = "MO_verde_project_WGS84"
    else:
        layer_name = ds

    if exists(f"/rest/workspaces/{WS}/layers/{layer_name}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/layers/{layer_name}?recurse=true")
        print(f"  DELETE layer {layer_name}: {code}")
    if exists(f"/rest/workspaces/{WS}/datastores/{ds}.json"):
        code, _ = req("DELETE", f"/rest/workspaces/{WS}/datastores/{ds}?recurse=true")
        print(f"  DELETE datastore {ds}: {code}")


# ==== Step 2: 创建新 datastore + featuretype ====
print()
print("=" * 60)
print("Step 2: 创建 13 个 GeoJSON datastore + featuretype")
print("=" * 60)
results = []
for layer in LAYERS:
    ds_name = f"MO_{layer}_project_wgs84"
    ft_name = f"MO_{layer}_project_WGS84"

    print(f"\n[{layer}]")
    code, text = create_geojson_datastore(ds_name, layer)
    print(f"  CREATE datastore {ds_name}: HTTP {code}")
    if code not in (201,):
        print(f"    ERROR: {text[:200]}")
        results.append((layer, "datastore", code))
        continue

    code, text = create_featuretype(ds_name, ft_name)
    print(f"  CREATE featuretype {ft_name}: HTTP {code}")
    if code not in (201,):
        print(f"    ERROR: {text[:300]}")
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