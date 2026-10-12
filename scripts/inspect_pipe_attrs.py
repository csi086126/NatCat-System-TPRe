import sys
sys.path.insert(0, "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Lib/site-packages")
import shapefile

for layer_path in [
    "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/pipeline/whole_link/whole_link.shp",
    "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/pipeline/whole_manhole/whole_manhole.shp",
    "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data/pipeline/whole_outlet/whole_outlet.shp",
]:
    print(f"=== {layer_path.split('/')[-2]}/{layer_path.split('/')[-1]} ===")
    r = shapefile.Reader(layer_path, encoding="utf-8")
    fields = [f[0] for f in r.fields[1:]]  # skip DeletionFlag
    print(f"Fields: {fields}")
    
    # Sample key fields across all features
    for fname in ["TypeNo", "Diameter", "MaterialID", "NetTypeNo", "Topography", "Enabled"]:
        if fname in fields:
            vals = set()
            for feat in r.shapeRecords():
                rec = feat.record
                idx = fields.index(fname)
                v = rec[idx]
                vals.add(v)
                if len(vals) > 20:
                    break
            vals = list(vals)[:20]
            print(f"  {fname}: {vals}")
    print()
