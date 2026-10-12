"""
Check internal consistency of CDROM_C WGS84 converted layers.
All 14 layers should be aligned with each other if source data is internally aligned.
"""
import os, glob
subprocess_path = "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Library/bin/ogrinfo.exe"

# Each layer's folder in converted dir
converted_dir = "D:/Nat Cat Platform/UI_system/scripts/cdrom_c_wgs84_data"
layers = sorted([d for d in os.listdir(converted_dir) 
                if os.path.isdir(os.path.join(converted_dir, d))])
print(f"Layers: {layers}")

import subprocess
for layer in layers:
    shp = os.path.join(converted_dir, layer, f"{layer}.shp")
    if not os.path.exists(shp):
        continue
    result = subprocess.run([subprocess_path, shp, "-al", "-so"], capture_output=True, text=True)
    lines = result.stdout.split("\n")
    for ln in lines:
        if "Extent:" in ln or "Feature Count" in ln:
            print(f"  {layer}: {ln.strip()}")

