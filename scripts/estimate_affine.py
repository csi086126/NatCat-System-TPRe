"""
Robustly estimate affine transform between CDROM_C and DistrictBoundary.

Approach: read boundary.shp (1 LineString) and find the polygon extents of 
DistrictBoundary. Match CDROM_C centroids to DistrictBoundary centroids at the 
corresponding sub-region level.

Since CDROM_C is one dataset, all 14 layers should share the same offset.
"""
import sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer
import math, struct

# Use proj to compute proper meter offsets
wgs84_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32650", always_xy=True)

def lonlat_to_meters(lons, lats):
    """Convert list of (lon, lat) to UTM 50N meters (Macau)."""
    xs, ys = [], []
    for lon, lat in zip(lons, lats):
        x, y = wgs84_to_utm.transform(lon, lat)
        xs.append(x); ys.append(y)
    return xs, ys

# All converted CDROM_C layer centroids (we computed above)
# Use lote since it has many features spread across the area
print("=== DistrictBoundary (reference WGS84) ===")
print("Overall extent: lon [113.5287, 113.5982], lat [22.1098, 22.2170]")
print("Centroid: (113.5635, 22.1634)")

# Convert to meters
ref_x, ref_y = wgs84_to_utm.transform(113.5635, 22.1634)
print(f"Reference centroid in UTM50N meters: ({ref_x:.1f}, {ref_y:.1f})")

# CDROM_C centroids
cdrom_centroids = {
    "boundary": (113.576180, 22.148060),  # from extent (113.525, 22.078)..(113.627, 22.218)
    "lote": (113.564152, 22.128300),       # from (113.5479, 22.1125)..(113.5804, 22.1442)
    "lake": (113.556566, 22.165226),       # from (113.527, 22.113)..(113.586, 22.218)
    "rua": (113.556471, 22.164850),
    "verde": (113.560767, 22.164892),
    "predio": (113.558116, 22.166122),
}
print("\n=== CDROM_C layer centroids ===")
for name, (lon, lat) in cdrom_centroids.items():
    x, y = wgs84_to_utm.transform(lon, lat)
    print(f"  {name}: ({lon:.4f}, {lat:.4f}) -> UTM ({x:.1f}, {y:.1f})")

# Compute mean offset from each CDROM layer to reference
print("\n=== Per-layer offsets (UTM meters) ===")
offsets = []
for name, (lon, lat) in cdrom_centroids.items():
    x, y = wgs84_to_utm.transform(lon, lat)
    dx = ref_x - x
    dy = ref_y - y
    offsets.append((name, dx, dy))
    print(f"  {name}: dx={dx:.0f}m, dy={dy:.0f}m")

# The offsets vary wildly because each layer's centroid is at different location
# AND we used "lote" extent centroid which is biased to where lote features are dense.
# This is not the right approach.
#
# Better: compute the offset from comparing corresponding landmarks.
# But we don't have explicit landmark matches.

# Use full extent centroid of CDROM_C (use boundary as overall envelope)
boundary_lon_min, boundary_lat_min = 113.525179, 22.077881
boundary_lon_max, boundary_lat_max = 113.627183, 22.218238
boundary_centroid_lon = (boundary_lon_min + boundary_lon_max) / 2
boundary_centroid_lat = (boundary_lat_min + boundary_lat_max) / 2
print(f"\n=== Boundary (CDROM_C envelope) centroid ===")
print(f"  ({boundary_centroid_lon:.4f}, {boundary_centroid_lat:.4f})")
b_x, b_y = wgs84_to_utm.transform(boundary_centroid_lon, boundary_centroid_lat)
print(f"  UTM: ({b_x:.1f}, {b_y:.1f})")
print(f"  Offset to reference centroid: dx={ref_x-b_x:.1f}m, dy={ref_y-b_y:.1f}m")

# Compare envelopes
print("\n=== Envelope comparison (UTM 50N) ===")
ref_extent_lon = (113.5287, 113.5982)
ref_extent_lat = (22.1098, 22.2170)
cdrom_extent_lon = (113.5252, 113.6272)
cdrom_extent_lat = (22.0779, 22.2182)

ref_corners = [(ref_extent_lon[0], ref_extent_lat[0]), (ref_extent_lon[1], ref_extent_lat[1])]
cdrom_corners = [(cdrom_extent_lon[0], cdrom_extent_lat[0]), (cdrom_extent_lon[1], cdrom_extent_lat[1])]

ref_xs, ref_ys = lonlat_to_meters([c[0] for c in ref_corners], [c[1] for c in ref_corners])
cdrom_xs, cdrom_ys = lonlat_to_meters([c[0] for c in cdrom_corners], [c[1] for c in cdrom_corners])

print(f"  Reference (DistrictBoundary) envelope corners:")
print(f"    SW UTM: ({ref_xs[0]:.1f}, {ref_ys[0]:.1f})")
print(f"    NE UTM: ({ref_xs[1]:.1f}, {ref_ys[1]:.1f})")
print(f"    width: {ref_xs[1]-ref_xs[0]:.1f}m, height: {ref_ys[1]-ref_ys[0]:.1f}m")

print(f"  CDROM_C envelope corners:")
print(f"    SW UTM: ({cdrom_xs[0]:.1f}, {cdrom_ys[0]:.1f})")
print(f"    NE UTM: ({cdrom_xs[1]:.1f}, {cdrom_ys[1]:.1f})")
print(f"    width: {cdrom_xs[1]-cdrom_xs[0]:.1f}m, height: {cdrom_ys[1]-cdrom_ys[0]:.1f}m")

# Offset: subtract SW corner from each
dx_sw = ref_xs[0] - cdrom_xs[0]
dy_sw = ref_ys[0] - cdrom_ys[0]
dx_ne = ref_xs[1] - cdrom_xs[1]
dy_ne = ref_ys[1] - cdrom_ys[1]
print(f"\n  Offset from SW corner: dx={dx_sw:.1f}m, dy={dy_sw:.1f}m")
print(f"  Offset from NE corner: dx={dx_ne:.1f}m, dy={dy_ne:.1f}m")

# If dx_sw == dx_ne, the offset is pure translation. Otherwise need affine (scale + rotation).
if abs(dx_sw - dx_ne) < 100 and abs(dy_sw - dy_ne) < 100:
    print("\n  ✓ Translation only (no scale/rotation needed)")
    print(f"  Mean offset: dx={(dx_sw+dx_ne)/2:.1f}m, dy={(dy_sw+dy_ne)/2:.1f}m")
else:
    print("\n  ⚠️ Affine (rotation/scale) required")

