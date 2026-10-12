# -*- coding: utf-8 -*-
"""Test publishing one SHP from D:\\MOData\\ (ASCII path) to GeoServer.
Uses pyshp to read the schema (since fiona is not available).
"""
import os
import sys
import requests
from requests.auth import HTTPBasicAuth
from pathlib import Path
import shapefile  # pyshp

GS = "http://localhost:8080/geoserver"
auth = HTTPBasicAuth("chensi", "CSma19921020~!")
WS = "natcat_platform"

shp = Path(r"D:\MOData\土地利用\CDROM_C\boundary\boundary.shp")
DS = "MO_TEST_LU_Boundary"
LAYER = "MO_TEST_LU_Boundary"

# Cleanup
requests.delete(f"{GS}/rest/workspaces/{WS}/layers/{LAYER}.json?recurse=true", auth=auth)
requests.delete(f"{GS}/rest/workspaces/{WS}/datastores/{DS}.json?recurse=true", auth=auth)

# 1. Create datastore
file_url = "file:///" + str(shp).replace("\\", "/")
body = {
    "dataStore": {
        "name": DS,
        "type": "Shapefile",
        "enabled": True,
        "workspace": {"name": WS},
        "connectionParameters": {
            "entry": [
                {"@key": "url", "$": file_url},
                {"@key": "charset", "$": "UTF-8"},
            ]
        },
    }
}
r = requests.post(f"{GS}/rest/workspaces/{WS}/datastores",
                  auth=auth, json=body, headers={"Content-Type": "application/json"})
print(f'Datastore create: {r.status_code} {r.text[:200]}')

# 2. Read SHP schema with pyshp
sf = shapefile.Reader(str(shp))
print(f'Shape type: {sf.shapeType} ({sf.shapeTypeName})')
fields = sf.fields
print(f'Fields: {fields}')
# Map OGR geom type
GEOM_BINDINGS = {
    0: "com.vividsolutions.jts.geom.Geometry",   # NULL
    1: "com.vividsolutions.jts.geom.Point",      # POINT
    3: "com.vividsolutions.jts.geom.LineString", # POLYLINE
    5: "com.vividsolutions.jts.geom.Polygon",    # POLYGON
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
geom_binding = GEOM_BINDINGS.get(sf.shapeType, "com.vividsolutions.jts.geom.Geometry")

# DBF type map (DBF type code -> GeoServer java binding)
# DBF types: C=char, N=number, F=float, L=logical, D=date, M=memo
DBF_TYPE_MAP = {
    "C": "java.lang.String",
    "N": "java.lang.Double",  # use Double to be safe
    "F": "java.lang.Double",
    "L": "java.lang.String",
    "D": "java.util.Date",
    "M": "java.lang.String",
}

# Build attributes list (skip first field which is deletion flag)
attributes = [{"name": "the_geom", "binding": geom_binding}]
for fld in fields[1:]:  # skip deletion flag
    name, ftype, size, dec = fld[0], fld[1], fld[2], fld[3]
    if name.lower() == 'shape' or name == '':
        continue
    binding = DBF_TYPE_MAP.get(ftype, "java.lang.String")
    attributes.append({"name": name, "binding": binding})
print(f'Attributes: {attributes}')

# 3. Create featureType with explicit attributes
body = {
    "featureType": {
        "name": LAYER,
        "title": "Macau Land Use — Boundary (test)",
        "enabled": True,
        "srs": "EPSG:4326",
        "attributes": {"attribute": attributes},
    }
}
r = requests.post(f"{GS}/rest/workspaces/{WS}/datastores/{DS}/featuretypes?configure=all",
                  auth=auth, json=body, headers={"Content-Type": "application/json"})
print(f'FeatureType create: {r.status_code} {r.text[:500]}')

# 4. Verify
r = requests.get(f"{GS}/rest/workspaces/{WS}/datastores/{DS}/featuretypes.json", auth=auth)
print(f'Featuretypes: {r.text[:500]}')

# Test WMS GetMap
if r.status_code == 200 and LAYER in r.text:
    r = requests.get(f"{GS}/natcat_platform/wms?service=WMS&version=1.1.1&request=GetMap&layers=natcat_platform:{LAYER}&bbox=113.5,22.1,113.6,22.25&width=256&height=256&srs=EPSG:4326&format=image/png",
                    auth=auth)
    print(f'WMS GetMap: {r.status_code} {len(r.content)} bytes, content-type: {r.headers.get("content-type")}')
    if r.status_code == 200:
        with open(r'D:\MOData\_test_shp.png', 'wb') as f:
            f.write(r.content)
        print('Saved to D:\\MOData\\_test_shp.png')

# Cleanup
requests.delete(f"{GS}/rest/workspaces/{WS}/layers/{LAYER}.json?recurse=true", auth=auth)
requests.delete(f"{GS}/rest/workspaces/{WS}/datastores/{DS}.json?recurse=true", auth=auth)
print('cleaned')