"""Match DistrictBoundary centroids to nearest CDROM_C vertices."""
import sys, struct, math
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer

wgs84_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32650", always_xy=True)

def read_shp_points(path, max_features=1000):
    """Read first N points from all features."""
    with open(path, "rb") as f:
        f.read(100)
        pts = []
        nfeat = 0
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                break
            rec_num = struct.unpack(">i", hdr[:4])[0]
            content_len_words = struct.unpack(">i", hdr[4:])[0]
            content = f.read(content_len_words * 2)
            if len(content) < 4:
                break
            shape_type = struct.unpack("<i", content[:4])[0]
            nfeat += 1
            if nfeat > max_features:
                break
            # Polygon or PolyLine shape
            if shape_type in (3, 13, 5, 15, 23, 25):  # PolyLine, PolyLineM, Polygon, PolygonM, etc.
                if shape_type in (13, 15, 23, 25, 28, 31):
                    # M versions: 4*8 box + 4 numParts + 4 numPoints + numParts*4 + numPoints*16 + m stuff
                    offset = 4 + 8*4
                    nparts = struct.unpack("<i", content[offset:offset+4])[0]
                    offset += 4
                    npts = struct.unpack("<i", content[offset:offset+4])[0]
                    offset += 4 + nparts*4
                    for _ in range(npts):
                        if offset+16 > len(content):
                            break
                        px, py = struct.unpack("<dd", content[offset:offset+16])
                        pts.append((rec_num, px, py))
                        offset += 16
                else:
                    offset = 4 + 4*4  # 4 box doubles
                    nparts = struct.unpack("<i", content[offset:offset+4])[0]
                    offset += 4
                    npts = struct.unpack("<i", content[offset:offset+4])[0]
                    offset += 4 + nparts*4
                    for _ in range(npts):
                        if offset+16 > len(content):
                            break
                        px, py = struct.unpack("<dd", content[offset:offset+16])
                        pts.append((rec_num, px, py))
                        offset += 16
        return pts

# Read CDROM_C boundary (LineString)
cdrom_boundary = read_shp_points("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/boundary/boundary.shp")
print(f"CDROM_C boundary: {len(cdrom_boundary)} points")
print(f"First 3: {cdrom_boundary[:3]}")

# Read CDROM_C lote (Polygon, 2300 features - limit to 500)
cdrom_lote = read_shp_points("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/lote/lote.shp", max_features=500)
print(f"CDROM_C lote (first 500 features): {len(cdrom_lote)} points")

# Combine all CDROM_C points to find overall envelope
cdrom_all = cdrom_boundary + cdrom_lote
cdrom_utm = [(wgs84_to_utm.transform(p[1], p[2])) for p in cdrom_all]

# DistrictBoundary centroids (UTM50N)
ref_centroids = [
    (1, 113.5438, 22.1283),
    (2, 113.5664, 22.2001),
    (3, 113.5429, 22.2016),
    (4, 113.5709, 22.1264),
    (5, 113.5459, 22.1895),
    (6, 113.5697, 22.1419),
    (7, 113.5348, 22.1891),
    (8, 113.5478, 22.2072),
    (9, 113.5761, 22.2005),
    (10, 113.5685, 22.1525),
    (11, 113.5490, 22.1994),
]

# For each centroid, find nearest CDROM_C point
print("\n=== Nearest CDROM_C vertex to each DistrictBoundary centroid ===")
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
    print(f"  rec={rec}: nearest CDROM_C dist={min_d:.0f}m, dx={dx:.0f}, dy={dy:.0f}")

dxs = [d[1] for d in deltas]
dys = [d[2] for d in deltas]
dists = [d[3] for d in deltas]
print(f"\n=== Mean offset ===")
print(f"  dx mean={sum(dxs)/len(dxs):.0f}m, std={(sum((x-sum(dxs)/len(dxs))**2 for x in dxs)/len(dxs))**0.5:.0f}m, range=[{min(dxs):.0f}, {max(dxs):.0f}]")
print(f"  dy mean={sum(dys)/len(dys):.0f}m, std={(sum((y-sum(dys)/len(dys))**2 for y in dys)/len(dys))**0.5:.0f}m, range=[{min(dys):.0f}, {max(dys):.0f}]")
print(f"  dist mean={sum(dists)/len(dists):.0f}m, range=[{min(dists):.0f}, {max(dists):.0f}]")

