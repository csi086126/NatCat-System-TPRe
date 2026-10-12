import sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer, CRS

# Source CRS via WKT (since EPSG:102159 not in proj)
src_wkt = open("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/土地利用/CDROM_C/boundary/boundary.prj", encoding="utf-8").read()
src_crs = CRS.from_wkt(src_wkt)

# Reference test point: (18835.586810, 5104.774980) - southwest corner of source
x_src, y_src = 18835.586810, 5104.774980

# Method A: ogr2ogr default (likely just project with geographic axis swap)
t_a = Transformer.from_crs(src_crs, "EPSG:4326", always_xy=True)
lon_a, lat_a = t_a.transform(x_src, y_src)
print(f"Method A (proj auto): ({lon_a:.6f}, {lat_a:.6f})")

# Method B: explicit datum via EPSG:4693 (Observatorio 1965), EPSG:102159 equivalent
# EPSG:102159 = Observatorio_1965_Macau_Grid (proj db might not have it)
# So we go via geographic: EPSG:4693 -> EPSG:4326 with datum shift
t_b_proj = Transformer.from_crs(src_crs, "EPSG:4693", always_xy=True)
x_4693, y_4693 = t_b_proj.transform(x_src, y_src)
print(f"Source projected to EPSG:4693 (geog): ({x_4693:.6f}, {y_4693:.6f})")

# Datum shift Observatorio 1965 -> WGS84
t_b_geo = Transformer.from_crs("EPSG:4693", "EPSG:4326", always_xy=True)
lon_b, lat_b = t_b_geo.transform(x_4693, y_4693)
print(f"Method B (Observatorio 1965 -> WGS84 with datum shift): ({lon_b:.6f}, {lat_b:.6f})")

# Method C: use only ellipsoid shift (no datum)
t_c = Transformer.from_crs("EPSG:4693", "EPSG:4326", always_xy=True)
# but with no datum grid (approximate)
lon_c, lat_c = t_c.transform(x_4693, y_4693, errcheck=True)
print(f"Method C (same as B but errcheck): ({lon_c:.6f}, {lat_c:.6f})")

# What's ogr2ogr doing? Check what ogr2ogr thinks the conversion is:
# Look at the actual converted value of the same point
# From ogrinfo: new extent starts at (113.525179, 22.077881)
# Let's see if a corner in source corresponds:
print("\n=== Source 4 corners vs converted extent ===")
corners_src = [
    ("SW", 18835.586810, 5104.774980),
    ("SE", 29360.416500, 5104.774980),
    ("NW", 18835.586810, 20646.862740),
    ("NE", 29360.416500, 20646.862740),
]
for name, x, y in corners_src:
    la, lb = t_a.transform(x, y)
    lb_lon, lb_lat = t_b_geo.transform(*t_b_proj.transform(x, y))
    print(f"  {name}: src ({x:.2f}, {y:.2f})")
    print(f"    Method A: ({la:.6f}, {lb:.6f})")
    print(f"    Method B: ({lb_lon:.6f}, {lb_lat:.6f})")

print(f"\nReference WGS84 (DistrictBoundary): lon 113.5287..113.5982, lat 22.1098..22.2170")
print(f"Converted extent:                      lon 113.5252..113.6272, lat 22.0779..22.2182")

