"""Measure offset between CDROM_C WGS84 and DistrictBoundary by comparing centroids."""
import os, sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
import struct

def get_features(path):
    """Read all features' bounding box and a sample of points."""
    with open(path, "rb") as f:
        f.read(100)
        feats = []
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
            # read box (4 doubles)
            if len(content) >= 4 + 32:
                xmin, ymin, xmax, ymax = struct.unpack("<4d", content[4:36])
                feats.append((rec_num, shape_type, xmin, ymin, xmax, ymax))
        return feats

# DistrictBoundary (WGS84 lat/lon Polygon)
ref = get_features("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/澳门区划边界数据WGS84坐标/澳门区划边界数据WGS84坐标.shp")
print("=== DistrictBoundary (11 features) ===")
xs_min, ys_min, xs_max, ys_max = [], [], [], []
for r in ref:
    print(f"  rec={r[0]}, type={r[1]}, xmin={r[2]:.6f}, ymin={r[3]:.6f}, xmax={r[4]:.6f}, ymax={r[5]:.6f}")
    xs_min.append(r[2]); ys_min.append(r[3]); xs_max.append(r[4]); ys_max.append(r[5])
print(f"  Overall extent: lon [{min(xs_min):.4f}, {max(xs_max):.4f}], lat [{min(ys_min):.4f}, {max(ys_max):.4f}]")
print(f"  Centroid: ({(min(xs_min)+max(xs_max))/2:.4f}, {(min(ys_min)+max(ys_max))/2:.4f})")

# CDROM_C converted lote (WGS84 Polygon, 2300 features)
lote = get_features("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/lote/lote.shp")
xs_min_l, ys_min_l, xs_max_l, ys_max_l = [], [], [], []
for r in lote[:20]:
    print(f"  lote rec={r[0]}, xmin={r[2]:.6f}, ymin={r[3]:.6f}, xmax={r[4]:.6f}, ymax={r[5]:.6f}")
    xs_min_l.append(r[2]); ys_min_l.append(r[3]); xs_max_l.append(r[4]); ys_max_l.append(r[5])
print(f"  lote overall extent: lon [{min(xs_min_l):.4f}, {max(xs_max_l):.4f}], lat [{min(ys_min_l):.4f}, {max(ys_max_l):.4f}]")
print(f"  lote centroid: ({(min(xs_min_l)+max(xs_max_l))/2:.4f}, {(min(ys_min_l)+max(ys_max_l))/2:.4f})")

# Compute offset
dlon = (min(xs_min)+max(xs_max))/2 - (min(xs_min_l)+max(xs_max_l))/2
dlat = (min(ys_min)+max(ys_max))/2 - (min(ys_min_l)+max(ys_max_l))/2
print(f"\nOffset needed (DistrictBoundary - CDROM_C): dlon={dlon:.6f}, dlat={dlat:.6f}")
print(f"  At 22deg lat: dlon={dlon*111000*math.cos(22*3.14159/180):.1f}m E/W, dlat={dlat*111000:.1f}m N/S")

import math
print(f"  meters E/W: {dlon * 111000 * math.cos(22.16 * math.pi/180):.0f}")
print(f"  meters N/S: {dlat * 111000:.0f}")

