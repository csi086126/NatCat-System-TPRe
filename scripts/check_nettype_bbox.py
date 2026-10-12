import sys, collections
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
import shapefile

r = shapefile.Reader("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/pipeline/whole_link/whole_link.shp", encoding="utf-8")
fields = [f[0] for f in r.fields[1:]]
nt_idx = fields.index("NetTypeNo")
diam_idx = fields.index("Diameter")

cnt = collections.Counter()
for feat in r.shapeRecords():
    shp = feat.shape
    rec = feat.record
    nt = rec[nt_idx]
    d = rec[diam_idx]
    # bbox check
    if shp.points:
        xs = [p[0] for p in shp.points]
        ys = [p[1] for p in shp.points]
        # 113.546..113.560, 22.18..22.20
        if any(113.546 <= x <= 113.560 for x in xs) and any(22.18 <= y <= 22.20 for y in ys):
            cnt[(nt, "%.1f" % d)] += 1

print("In bbox 113.546..113.560, 22.18..22.20:")
for k, v in sorted(cnt.items()):
    print(f"  NetTypeNo={k[0]}, Diameter={k[1]}: {v}")
