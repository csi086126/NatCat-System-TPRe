"""Check current state of .shp + .prj for all 14 layers."""
import warnings; warnings.filterwarnings('ignore')
import geopandas as gpd
import os

BASE = "D:/Nat Cat Platform/FloodData/MO_FloodData/下墊面數據/下墊面數據For_TAIPINGRE/土地利用/CDROM_C"

LAYERS = ['boundary','centerline','doorNo','lake','lote','monte','place','ponte',
          'predio','rua','terra','tower','verde','xinqiao']

for name in LAYERS:
    if name == 'xinqiao':
        shp = f"{BASE}/monte/{name}.shp"
    else:
        shp = f"{BASE}/{name}/{name}.shp"
    prj = shp.replace('.shp', '.prj')

    has_prj = os.path.exists(prj)
    prj_first = ''
    if has_prj:
        with open(prj, 'rb') as f:
            prj_first = f.read(100).decode('utf-8', errors='ignore')

    try:
        kw = {}
        if name == 'centerline':
            kw['encoding'] = 'gbk'
        kw['on_invalid'] = 'ignore'
        g = gpd.read_file(shp, **kw)
        b = g.total_bounds
        crs = str(g.crs)[:50] if g.crs else 'None'
        print(f"{name:12} crs={crs:30} bbox=({b[0]:.2f},{b[1]:.2f},{b[2]:.2f},{b[3]:.2f})  prj={'YES: '+prj_first[:40] if has_prj else 'NO'}")
    except Exception as e:
        print(f"{name:12} ERROR: {e}")