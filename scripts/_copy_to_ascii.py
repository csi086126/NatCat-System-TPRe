# -*- coding: utf-8 -*-
"""Copy Macau data files to ASCII-named directories (no Chinese chars anywhere).
GeoServer's shapefile reader uses temp file swap which breaks on non-ASCII paths.
"""
import os, shutil
from pathlib import Path

# Map Chinese subdir names to ASCII names
SUBDIR_MAP = {
    'DEM_with channel': 'dem',
    '土地利用': 'landuse',
    '建築分類': 'building_tiv',
    '澳门区划边界数据WGS84坐标': 'admin_boundary',
    '管網': 'pipe_network',
    'CDROM_C': 'CDROM_C',
    'boundary': 'boundary',
    'centerline': 'centerline',
    'doorNo': 'door_no',
    'lake': 'lake',
    'lote': 'lote',
    'monte': 'monte',
    'place': 'place',
    'ponte': 'ponte',
    'predio': 'predio',
    'rua': 'rua',
    'terra': 'terra',
    'tower': 'tower',
    'verde': 'verde',
    '澳门区划边界数据WGS84坐标': 'district',
    '澳门统计区（WGS84坐标系）': 'stat_area',
}

FILE_MAP = {
    'DEM_with channel.tif': 'dem.tif',
    'DEM_with channel.tfw': 'dem.tfw',
    'DEM_with channel.tif.aux.xml': 'dem.tif.aux.xml',
    'DEM_with channel.tif.ovr': 'dem.tif.ovr',
    # Land use shapefiles
    'boundary.shp': 'boundary.shp',
    'boundary.dbf': 'boundary.dbf',
    'boundary.shx': 'boundary.shx',
    'boundary.prj': 'boundary.prj',
    'boundary.sbn': 'boundary.sbn',
    'boundary.sbx': 'boundary.sbx',
    'boundary.shp.xml': 'boundary.shp.xml',
    'centerline.shp': 'centerline.shp',
    'centerline.dbf': 'centerline.dbf',
    'centerline.shx': 'centerline.shx',
    'centerline.cpg': 'centerline.cpg',
    'centerline.sbn': 'centerline.sbn',
    'centerline.sbx': 'centerline.sbx',
    'centerline.shp.xml': 'centerline.shp.xml',
    'doorNo.shp': 'door_no.shp',
    'doorNo.dbf': 'door_no.dbf',
    'doorNo.shx': 'door_no.shx',
    'doorNo.sbn': 'door_no.sbn',
    'doorNo.sbx': 'door_no.sbx',
    'doorNo.shp.xml': 'door_no.shp.xml',
    'lake.shp': 'lake.shp',
    'lake.dbf': 'lake.dbf',
    'lake.shx': 'lake.shx',
    'lake.sbn': 'lake.sbn',
    'lake.sbx': 'lake.sbx',
    'lake.shp.xml': 'lake.shp.xml',
    'lote.shp': 'lote.shp',
    'lote.dbf': 'lote.dbf',
    'lote.shx': 'lote.shx',
    'lote.prj': 'lote.prj',
    'lote.sbn': 'lote.sbn',
    'lote.sbx': 'lote.sbx',
    'lote.shp.xml': 'lote.shp.xml',
    'monte.shp': 'monte.shp',
    'monte.dbf': 'monte.dbf',
    'monte.shx': 'monte.shx',
    'monte.CPG': 'monte.CPG',
    'monte.sbn': 'monte.sbn',
    'monte.sbx': 'monte.sbx',
    'monte.shp.xml': 'monte.shp.xml',
    'place.shp': 'place.shp',
    'place.dbf': 'place.dbf',
    'place.shx': 'place.shx',
    'place.CPG': 'place.CPG',
    'place.sbn': 'place.sbn',
    'place.sbx': 'place.sbx',
    'place.shp.xml': 'place.shp.xml',
    'ponte.shp': 'ponte.shp',
    'ponte.dbf': 'ponte.dbf',
    'ponte.shx': 'ponte.shx',
    'ponte.sbn': 'ponte.sbn',
    'ponte.sbx': 'ponte.sbx',
    'ponte.shp.xml': 'ponte.shp.xml',
    'predio.shp': 'predio.shp',
    'predio.dbf': 'predio.dbf',
    'predio.shx': 'predio.shx',
    'predio.CPG': 'predio.CPG',
    'predio.sbn': 'predio.sbn',
    'predio.sbx': 'predio.sbx',
    'predio.shp.xml': 'predio.shp.xml',
    'rua.shp': 'rua.shp',
    'rua.dbf': 'rua.dbf',
    'rua.shx': 'rua.shx',
    'rua.prj': 'rua.prj',
    'rua.sbn': 'rua.sbn',
    'rua.sbx': 'rua.sbx',
    'rua.shp.xml': 'rua.shp.xml',
    'terra.shp': 'terra.shp',
    'terra.dbf': 'terra.dbf',
    'terra.shx': 'terra.shx',
    'terra.prj': 'terra.prj',
    'terra.sbn': 'terra.sbn',
    'terra.sbx': 'terra.sbx',
    'terra.shp.xml': 'terra.shp.xml',
    'tower.shp': 'tower.shp',
    'tower.dbf': 'tower.dbf',
    'tower.shx': 'tower.shx',
    'tower.CPG': 'tower.CPG',
    'tower.sbn': 'tower.sbn',
    'tower.sbx': 'tower.sbx',
    'tower.shp.xml': 'tower.shp.xml',
    'verde.shp': 'verde.shp',
    'verde.dbf': 'verde.dbf',
    'verde.shx': 'verde.shx',
    'verde.sbn': 'verde.sbn',
    'verde.sbx': 'verde.sbx',
    'verde.shp.xml': 'verde.shp.xml',
    # Building TIV
    'final_estimated_tiv_selected_fields_BITIV.shp': 'building_tiv.shp',
    'final_estimated_tiv_selected_fields_BITIV.dbf': 'building_tiv.dbf',
    'final_estimated_tiv_selected_fields_BITIV.shx': 'building_tiv.shx',
    'final_estimated_tiv_selected_fields_BITIV.prj': 'building_tiv.prj',
    'final_estimated_tiv_selected_fields_BITIV.cpg': 'building_tiv.cpg',
    # Admin boundary
    '澳门区划边界数据WGS84坐标.shp': 'district_boundary.shp',
    '澳门区划边界数据WGS84坐标.dbf': 'district_boundary.dbf',
    '澳门区划边界数据WGS84坐标.shx': 'district_boundary.shx',
    '澳门区划边界数据WGS84坐标.prj': 'district_boundary.prj',
    '澳门区划边界数据WGS84坐标.cpg': 'district_boundary.cpg',
    # Statistical area
    '澳门统计区（WGS84坐标系）.shp': 'stat_area.shp',
    '澳门统计区（WGS84坐标系）.dbf': 'stat_area.dbf',
    '澳门统计区（WGS84坐标系）.shx': 'stat_area.shx',
    '澳门统计区（WGS84坐标系）.prj': 'stat_area.prj',
    '澳门统计区（WGS84坐标系）.cpg': 'stat_area.cpg',
    # Pipe network
    'whole_link.shp': 'pipe_link.shp',
    'whole_link.dbf': 'pipe_link.dbf',
    'whole_link.shx': 'pipe_link.shx',
    'whole_link.prj': 'pipe_link.prj',
    'whole_link.sbn': 'pipe_link.sbn',
    'whole_link.sbx': 'pipe_link.sbx',
    'whole_link.shp.xml': 'pipe_link.shp.xml',
    'whole_manhole.shp': 'pipe_manhole.shp',
    'whole_manhole.dbf': 'pipe_manhole.dbf',
    'whole_manhole.shx': 'pipe_manhole.shx',
    'whole_manhole.prj': 'pipe_manhole.prj',
    'whole_manhole.sbn': 'pipe_manhole.sbn',
    'whole_manhole.sbx': 'pipe_manhole.sbx',
    'whole_manhole.shp.xml': 'pipe_manhole.shp.xml',
    'whole_outlet.shp': 'pipe_outlet.shp',
    'whole_outlet.dbf': 'pipe_outlet.dbf',
    'whole_outlet.shx': 'pipe_outlet.shx',
    'whole_outlet.prj': 'pipe_outlet.prj',
    'whole_outlet.sbn': 'pipe_outlet.sbn',
    'whole_outlet.sbx': 'pipe_outlet.sbx',
    'whole_outlet.shp.xml': 'pipe_outlet.shp.xml',
}

SRC = Path(r"D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據For_TAIPINGRE")
DST = Path(r"D:\MOData")  # ASCII root

# Clean DST
if DST.exists():
    shutil.rmtree(DST, ignore_errors=True)
DST.mkdir(parents=True, exist_ok=True)

count = 0
for src_path in SRC.rglob("*"):
    if not src_path.is_file():
        continue
    name = src_path.name
    if name.endswith(".sr.lock") or name == "Thumbs.db" or name.endswith(".zip") or name.endswith(".xls"):
        continue
    if name.endswith(".xls") or name.endswith(".xlsx"):
        continue

    rel = src_path.relative_to(SRC)
    parts = list(rel.parts)

    # Translate directory parts
    new_parts = []
    for p in parts[:-1]:
        new_parts.append(SUBDIR_MAP.get(p, p))
    # Translate filename
    fname = parts[-1]
    new_fname = FILE_MAP.get(fname, fname)

    # Handle duplicate district/stat files: they have same name in different subdirs
    rel_path = Path(*new_parts) / new_fname
    dst_path = DST / rel_path
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # Skip ArcGIS metadata files
    if new_fname.endswith('.qmd'):
        continue

    try:
        with open(src_path, 'rb') as fr, open(dst_path, 'wb') as fw:
            shutil.copyfileobj(fr, fw)
        count += 1
    except Exception as e:
        print(f'  ERR {rel}: {e}')

print(f"Copied {count} files")
print(f"DST tree:")
for p in sorted(DST.rglob("*"))[:50]:
    if p.is_file():
        sz = p.stat().st_size
        print(f'  {p.relative_to(DST)} ({sz:,} bytes)')