"""
Reproject CDROM_C shapefiles from EPSG:102159 to WGS84 with proper
International_1924 -> WGS84 datum transformation using pyproj.

EPSG:102159 not in proj.db (it's a Macau-only historical grid).
Strategy: build custom proj string with +datum=intl + towgs84 Helmert params:
  - International_1924 -> WGS84 (EPSG default for HK/Macau area):
      towgs84=-162.105,-276.105,-161.665,-0.0677534,2.24365,-1.15883,-1.09425
    (these are typical values for HK/Macau region)
  - But these are for HK 1980 Grid (EPSG:2326). For International_1924 we need different.
  
Best approach: use the local tie via reference DistrictBoundary which is WGS84.
Compute a local affine transform from 4 corner points.
"""
import sys, os
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")

from pyproj import Transformer, CRS, Proj
import math

# Try the conventional towgs84 for International_1924 -> WGS84 (for region near HK/Macau)
# Multiple values exist. Try several:
towgs84_options = [
    # EPSG default for International_1924 to WGS84 (most used, may be zero)
    ("EPSG default (all zero)", "+towgs84=0,0,0,0,0,0,0"),
    # Hong Kong/China region variant
    ("HK-China variant", "+towgs84=-162.105,-276.105,-161.665,0.0677534,-2.24365,1.15883,1.09425"),
    # Another common one
    ("Alt intl-wgs84", "+towgs84=-251.0,-157.0,-117.0,0.0,0.0,0.0,0.0"),
]

# Source CRS WKT
src_wkt = open("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/土地利用/CDROM_C/boundary/boundary.prj", encoding="utf-8").read()

# Build src CRS without proj db (use +proj=tmerc +approx)
src_crs = CRS.from_wkt(src_wkt)
print("Source CRS:", src_crs.name)

# Test point: SW corner of source boundary
test_x, test_y = 18835.586810, 5104.774980

# Target: reference DistrictBoundary SW corner
target_lon, target_lat = 113.528737, 22.109766
print(f"\nSource SW: ({test_x}, {test_y})")
print(f"Target  SW (DistrictBoundary): ({target_lon}, {target_lat})")
print(f"Delta needed: dlon={target_lon-113.525:.6f}, dlat={target_lat-22.078:.6f}")
# This delta = (0.003737, 0.031766) = ~415m E + 3.5km N

# Build custom src CRS with various towgs84
for label, towgs in towgs84_options:
    custom_wkt = src_wkt.replace('GEOGCS["GCS_Observatorio_Meteorologico_1965"',
                                  'GEOGCS["GCS_Observatorio_Meteorologico_1965_CUSTOM"')
    # Insert towgs84 into DATUM
    custom_wkt = custom_wkt.replace(
        'DATUM["D_Observatorio_Meteorologico_1965"',
        f'DATUM["D_Observatorio_Meteorologico_1965_CUSTOM",{towgs}'
    )
    # add ",TOWGS84[1,2,3,4,5,6,7]" form to be safe
    src_custom = CRS.from_wkt(custom_wkt)
    t = Transformer.from_crs(src_custom, "EPSG:4326", always_xy=True)
    lon, lat = t.transform(test_x, test_y)
    print(f"\n{label}: ({lon:.6f}, {lat:.6f})")
    print(f"  delta from DistrictBoundary SW: dlon={lon-target_lon:.6f}, dlat={lat-target_lat:.6f}")

# Approach B: use local affine correction. 
# We know: at source (18835.59, 5104.77) we want target (113.528737, 22.109766)
# At source (29360.42, 20646.86) we want target ~(113.598, 22.217)
# So: lon = 113.5xxx + dx*scale, lat = 22.0xxx + dy*scale
# We can compute scale based on extents and shift.

