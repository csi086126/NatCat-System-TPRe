# -*- coding: utf-8 -*-
import shapefile
import os

files = [
    r'D:\MOData\土地利用\CDROM_C\boundary\boundary.shp',
    r'D:\MOData\土地利用\CDROM_C\rua\rua.shp',
    r'D:\MOData\土地利用\CDROM_C\predio\predio.shp',
    r'D:\MOData\土地利用\CDROM_C\lake\lake.shp',
    r'D:\MOData\土地利用\CDROM_C\centerline\centerline.shp',
    r'D:\MOData\管網\whole_link.shp',
    r'D:\MOData\管網\whole_manhole.shp',
    r'D:\MOData\管網\whole_outlet.shp',
    r'D:\MOData\建築分類\final_estimated_tiv_selected_fields_BITIV.shp',
    r'D:\MOData\澳门区划边界数据WGS84坐标\澳门区划边界数据WGS84坐标\澳门区划边界数据WGS84坐标.shp',
    r'D:\MOData\澳门区划边界数据WGS84坐标\澳门统计区（WGS84坐标系）\澳门统计区（WGS84坐标系）.shp',
]
for fp in files:
    sf = shapefile.Reader(fp)
    fields = [(f.name, str(f.field_type), f.size, f.decimal) for f in sf.fields[1:]]
    name = os.path.basename(fp)
    print(f'{name}: type={sf.shapeType} ({sf.shapeTypeName}), records={len(sf)}, fields={fields}')