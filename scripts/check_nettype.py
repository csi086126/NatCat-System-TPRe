import sys, collections
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
import shapefile

r = shapefile.Reader("D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/pipeline/whole_link/whole_link.shp", encoding="utf-8")
fields = [f[0] for f in r.fields[1:]]
nt_idx = fields.index("NetTypeNo")
diam_idx = fields.index("Diameter")

cnt = collections.Counter()
combo = collections.Counter()
for feat in r.shapeRecords():
    rec = feat.record
    nt = rec[nt_idx]
    d = rec[diam_idx]
    cnt[nt] += 1
    combo[(nt, "%.1f" % d)] += 1

print("NetTypeNo distribution:")
for k, v in sorted(cnt.items()):
    print(f"  NetTypeNo={k}: {v} features")

print("\nTop 10 (NetTypeNo, Diameter bin) combos:")
for (k, d), v in sorted(combo.items(), key=lambda x: -x[1])[:15]:
    print(f"  NetTypeNo={k}, Diameter={d}: {v} features")
