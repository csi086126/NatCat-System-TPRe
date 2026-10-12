"""Match DistrictBoundary centroids to nearest CDROM_C vertices using pyshp."""
import sys, math
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer
import shapefile

wgs84_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32650", always_xy=True)

def all_points(path):
    """Get all (lon, lat) vertices from a shapefile."""
    r = shapefile.Reader(path, encoding="utf-8")
    pts = []
    for feat in r.shapeRecords():
        shp = feat.shape
        if shp.shapeType in (shapefile.POLYLINE, shapefile.POLYGON):
            for part in shp.parts:
                pts.append(shp.points[part])
            # walk through ring
            for i in range(len(shp.parts)):
                start = shp.parts[i]
                end = shp.parts[i+1] if i+1 < len(shp.parts) else len(shp.points)
                pts.extend(shp.points[start:end])
        elif shp.shapeType in (shapefile.POLYLINE_M, shapefile.POLYGON_M):
            for i in range(len(shp.parts)):
                start = shp.parts[i]
                end = shp.parts[i+1] if i+1 < len(shp.parts) else len(shp.points)
                pts.extend(shp.points[start:end])
    return pts

# Read CDROM_C boundary line
cdrom_b_pts = all_points("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/boundary/boundary.shp")
print(f"CDROM_C boundary: {len(cdrom_b_pts)} vertices")
print(f"  first 3: {cdrom_b_pts[:3]}")

# Read CDROM_C lote polygons (limit via shapefile iter)
cdrom_lote_pts = []
r = shapefile.Reader("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/lote/lote.shp", encoding="utf-8")
for feat in r.shapeRecords():
    for i in range(len(feat.shape.parts)):
        start = feat.shape.parts[i]
        end = feat.shape.parts[i+1] if i+1 < len(feat.shape.parts) else len(feat.shape.points)
        cdrom_lote_pts.extend(feat.shape.points[start:end])
print(f"CDROM_C lote: {len(cdrom_lote_pts)} vertices")

# Combine
cdrom_all = cdrom_b_pts + cdrom_lote_pts
cdrom_utm = [(wgs84_to_utm.transform(p[0], p[1])) for p in cdrom_all]

# DistrictBoundary centroids
ref_centroids = [
    (1, 113.5438, 22.1283), (2, 113.5664, 22.2001), (3, 113.5429, 22.2016),
    (4, 113.5709, 22.1264), (5, 113.5459, 22.1895), (6, 113.5697, 22.1419),
    (7, 113.5348, 22.1891), (8, 113.5478, 22.2072), (9, 113.5761, 22.2005),
    (10, 113.5685, 22.1525), (11, 113.5490, 22.1994),
]

# Find nearest CDROM_C vertex
deltas = []
for rec, lon, lat in ref_centroids:
    ux, uy = wgs84_to_utm.transform(lon, lat)
    min_d = float('inf')
    nearest = None
    for px, py in cdrom_utm:
        d = math.hypot(px - ux, py - uy)
        if d < min_d:
            min_d = d
            nearest = (px, py)
    pnx, pny = nearest
    dx = ux - pnx
    dy = uy - pny
    deltas.append((rec, dx, dy, min_d))
    print(f"  rec={rec}: dist={min_d:.0f}m, offset=(dx={dx:.0f}, dy={dy:.0f})m")

dxs = [d[1] for d in deltas]
dys = [d[2] for d in deltas]
dists = [d[3] for d in deltas]
print(f"\n=== Mean ===")
print(f"  dx mean={sum(dxs)/len(dxs):.0f}m, std={(sum((x-sum(dxs)/len(dxs))**2 for x in dxs)/len(dxs))**0.5:.0f}m, range=[{min(dxs):.0f}, {max(dxs):.0f}]")
print(f"  dy mean={sum(dys)/len(dys):.0f}m, std={(sum((y-sum(dys)/len(dys))**2 for y in dys)/len(dys))**0.5:.0f}m, range=[{min(dys):.0f}, {max(dys):.0f}]")
print(f"  nearest dist mean={sum(dists)/len(dists):.0f}m, range=[{min(dists):.0f}, {max(dists):.0f}]")

# If std is small (<500m) then pure translation works
# Otherwise need affine / TPS

