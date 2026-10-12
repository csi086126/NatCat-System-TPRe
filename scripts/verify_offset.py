import sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
from pyproj import Transformer

# 验证 DistrictBoundary 文件 (WGS84) 第 1 个点
with open("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/澳门区划边界数据WGS84坐标/澳门区划边界数据WGS84坐标.shp", "rb") as f:
    pass

import struct

def read_shp_points(path):
    """Read first few points from .shp"""
    with open(path, "rb") as f:
        # Skip 100 byte header
        f.seek(100)
        pts = []
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
            if shape_type == 13:  # PolyLineM
                # Skip box (8*4 bytes), num parts, num points
                offset = 4 + 8*4 + 4 + 4
                npts = struct.unpack("<i", content[offset:offset+4])[0]
                offset += 4 + 4*npts  # skip nparts + parts
                # Read first point
                px, py = struct.unpack("<dd", content[offset:offset+16])
                pts.append((rec_num, shape_type, px, py))
                break
            elif shape_type == 3:  # PolyLine
                # box (4*4 bytes), num_parts, num_points
                offset = 4 + 4*4 + 4
                npts = struct.unpack("<i", content[offset:offset+4])[0]
                offset += 4 + 4*npts
                px, py = struct.unpack("<dd", content[offset:offset+16])
                pts.append((rec_num, shape_type, px, py))
                break
            else:
                pts.append((rec_num, shape_type, None, None))
                break
    return pts

# DistrictBoundary (WGS84 lat/lon)
ref_pts = read_shp_points("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/澳门区划边界数据WGS84坐标/澳门区划边界数据WGS84坐标.shp")
print("=== Reference DistrictBoundary first point ===")
for r in ref_pts:
    print(r)

# New CDROM_C WGS84 boundary
new_pts = read_shp_points("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/boundary/boundary.shp")
print("\n=== New WGS84 CDROM_C boundary first point ===")
for r in new_pts:
    print(r)

# What's in source CDROM_C?
src_pts = read_shp_points("D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/土地利用/CDROM_C/boundary/boundary.shp")
print("\n=== Source CDROM_C boundary first point (EPSG:102159) ===")
for r in src_pts:
    print(r)

