import sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer, CRS

# 1. CDROM_C original CRS via prj file
with open("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/土地利用/CDROM_C/boundary/boundary.prj", "r", encoding="utf-8") as f:
    src_wkt = f.read()

print("=== Source CRS WKT (CDROM_C/boundary) ===")
print(src_wkt)

src_crs = CRS.from_wkt(src_wkt)
print(f"\nCRS name: {src_crs.name}")
print(f"CRS EPSG: detected via EPSG:{src_crs.to_epsg()}" if src_crs.to_epsg() else "")

# 2. EPSG:102159 = Observatorio_Meteorologico_1965_Macau_Grid
# Use EPSG:102159 from proj db
print("\n=== Test point transforms ===")
# Sample point from Macao (rough center)
test_points = [
    ("Macao center", 20000, 20000),
    ("Coast east", 25000, 18000),
    ("Coast west", 15000, 22000),
]

# Method 1: EPSG:102159 -> EPSG:4326 with default datum
t1 = Transformer.from_crs("EPSG:102159", "EPSG:4326", always_xy=True)
print("\nMethod 1 (EPSG:102159 -> EPSG:4326, default datum):")
for name, x, y in test_points:
    lon, lat = t1.transform(x, y)
    print(f"  {name}: ({x}, {y}) -> ({lon:.7f}, {lat:.7f})")

# Method 2: Try with explicit pipeline via EPSG:3753 (WGS84 / Macau Grid, an alternative)
try:
    t2 = Transformer.from_crs("EPSG:102159", "EPSG:4326", always_xy=True)
    print("\nMethod 2 same as 1")
except Exception as e:
    print(f"\nMethod 2 error: {e}")

# 3. Reference District Boundary extent (WGS84 lat/lon)
ref_bbox = (113.5287, 113.5982, 22.1098, 22.2170)
print(f"\n=== Reference District Boundary extent (WGS84) ===")
print(f"  lon: {ref_bbox[0]:.4f} .. {ref_bbox[1]:.4f}")
print(f"  lat: {ref_bbox[2]:.4f} .. {ref_bbox[3]:.4f}")

