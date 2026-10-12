# What does DistrictBoundary look like in WGS84? Is it really aligned with satellite imagery?
# Read a few points and check coords
import subprocess
result = subprocess.run([
    "C:/Users/sichen/AppData/Local/anaconda3/envs/geo_env/Library/bin/ogrinfo.exe",
    "-so",
    "D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/澳门区划边界数据WGS84坐标/澳门区划边界数据WGS84坐标.shp"
], capture_output=True, text=True)
print(result.stdout)
