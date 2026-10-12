# -*- coding: utf-8 -*-
"""Test GeoServer file upload endpoint with correct field names."""
import os, sys
import requests
from requests.auth import HTTPBasicAuth
from pathlib import Path

GS = "http://localhost:8080/geoserver"
auth = HTTPBasicAuth("chensi", "CSma19921020~!")

ws = "natcat_platform"
shp = Path(r"D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據For_TAIPINGRE\土地利用\CDROM_C\boundary\boundary.shp")

ds_name = "MO_TEST_Boundary"
layer_name = "MO_TEST_Boundary"

# Delete existing if any
for url in [
    f"{GS}/rest/workspaces/{ws}/layers/{layer_name}.json?recurse=true",
    f"{GS}/rest/workspaces/{ws}/datastores/{ds_name}.json?recurse=true",
]:
    requests.delete(url, auth=auth)

# GeoServer expects field names: 'shp', 'dbf', 'shx', 'prj', 'cpg'
# (NOT 'shape.shp', 'shape.dbf' etc.)
files = []
for field_name, ext in [('shp', '.shp'), ('dbf', '.dbf'), ('shx', '.shx'), ('prj', '.prj')]:
    f = shp.with_suffix(ext)
    if f.exists():
        files.append((field_name, (f.name, open(f, 'rb'), 'application/octet-stream')))
        print(f'Adding field "{field_name}": {f.name} ({f.stat().st_size} bytes)')

url = f"{GS}/rest/workspaces/{ws}/datastores/{ds_name}/file.shp"
params = {"configure": "all"}
r = requests.put(url, auth=auth, files=files, params=params)
print(f'Upload status: {r.status_code}')
print(f'Response: {r.text[:500]}')

for _, fh in files:
    fh[1].close()

# Verify
r = requests.get(f"{GS}/rest/workspaces/{ws}/datastores/{ds_name}/featuretypes.json", auth=auth)
print(f'Featuretypes: {r.status_code}')
print(r.text[:500])