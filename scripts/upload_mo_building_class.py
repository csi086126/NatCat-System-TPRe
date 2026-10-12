"""上传 1 个 Polygon layer: building_classification 到 GeoServer (Shapefile datastore)"""
import io
import sys
import struct
import requests
from requests.auth import HTTPBasicAuth

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

GEOSERVER = "http://10.253.22.15:8080/geoserver"
AUTH = HTTPBasicAuth("chensi", "CSma19921020~!")
WS = "natcat_platform"
DS_BASE = "C:/ProgramData/GeoServer/data/natcat_platform"

LAYER = "building_classification"
DS_NAME = "MO_building_classification_project_wgs84"
FT_NAME = "MO_building_classification_project_WGS84"
DEST_DIR = f"{DS_BASE}/MO_building_classification_v2_wgs84"
SHP_PATH = f"{DEST_DIR}/MO_building_classification_project_WGS84.shp".replace("/", "\\")


def req(method, path, json_body=None, params=None):
    r = requests.request(method, f"{GEOSERVER}{path}", auth=AUTH,
                         json=json_body, params=params or {})
    return r.status_code, r.text


def exists(path):
    return req("GET", path)[0] == 200


def get_attributes_from_shp(shp_path):
    """直接读 DBF header 拿字段 + .shp header 拿几何类型"""
    type_map = {
        "C": "java.lang.String",
        "N": "java.lang.Double",
        "F": "java.lang.Double",
        "L": "java.lang.Boolean",
        "D": "java.sql.Date",
        "M": "java.lang.String",
    }
    dbf_path = shp_path.replace(".shp", ".dbf")
    with open(dbf_path, "rb") as f:
        f.read(32)
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

    with open(shp_path, "rb") as f:
        shp_header = f.read(100)
    shape_type = struct.unpack("<I", shp_header[32:36])[0]
    geom_map = {
        0: "org.locationtech.jts.geom.Geometry",
        1: "org.locationtech.jts.geom.Point",
        3: "org.locationtech.jts.geom.MultiLineString",
        5: "org.locationtech.jts.geom.MultiPolygon",
        8: "org.locationtech.jts.geom.MultiPoint",
        11: "org.locationtech.jts.geom.Point",
        13: "org.locationtech.jts.geom.MultiLineString",
        15: "org.locationtech.jts.geom.MultiPolygon",
    }
    geom_binding = geom_map.get(shape_type, "org.locationtech.jts.geom.Geometry")
    attrs.append({"name": "the_geom", "binding": geom_binding})
    return attrs


def create_shp_datastore(ds_name, dest_dir):
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


# ==== Step 1: 清理旧的同名 datastore + layer (若存在) ====
print("Step 1: 清理旧的 datastore + layer")
if exists(f"/rest/workspaces/{WS}/layers/{FT_NAME}.json"):
    code, _ = req("DELETE", f"/rest/workspaces/{WS}/layers/{FT_NAME}?recurse=true")
    print(f"  DELETE layer {FT_NAME}: {code}")
if exists(f"/rest/workspaces/{WS}/datastores/{DS_NAME}.json"):
    code, _ = req("DELETE", f"/rest/workspaces/{WS}/datastores/{DS_NAME}?recurse=true")
    print(f"  DELETE datastore {DS_NAME}: {code}")


# ==== Step 2: 创建 datastore + featuretype ====
print("\nStep 2: 创建 datastore + featuretype")
code, text = create_shp_datastore(DS_NAME, DEST_DIR)
print(f"  CREATE datastore {DS_NAME}: HTTP {code}")
if code != 201:
    print(f"    ERROR: {text[:300]}")
    sys.exit(1)

attributes = get_attributes_from_shp(SHP_PATH)
print(f"  attributes ({len(attributes)}): {[a['name'] for a in attributes]}")

code, text = create_featuretype(DS_NAME, FT_NAME, attributes)
print(f"  CREATE featuretype {FT_NAME}: HTTP {code}")
if code != 201:
    print(f"    ERROR: {text[:300]}")
    sys.exit(1)

print(f"\n✓ {LAYER} 上传成功: datastore={DS_NAME}, featuretype={FT_NAME}")
