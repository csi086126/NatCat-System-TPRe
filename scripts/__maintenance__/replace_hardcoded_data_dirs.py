#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P0-#1: 把 scripts/ 和根目录里硬编码的 D:/... 或 D:\\... 数据目录路径
替换为读取 .env 中的变量名(保持 Windows 默认值不变)。

不要把本脚本永久合入生产代码——它是开发者本机的"一次性清理工具"。
"""
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 统一用 / 作为 key,lookup 时不区分正反斜杠
PATH_MAP = {
    'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK': 'TPHK_DATA_DIR',
    'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPMO': 'TPMO_DATA_DIR',
    'D:/web-flood-insurance-model/Data/IBTracks': 'IBTRACS_DATA_DIR',
    'D:/Nat Cat Platform/Data/Shapefile': 'SHAPEFILE_DIR',
    'D:/web-flood-insurance-model/Data/Shapefile': 'GADM_DATA_DIR',
    'D:/Nat Cat Platform/UI_system/public/data': 'PUBLIC_DATA_DIR',
    'D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/WGS84': 'MACAU_DATA_DIR',
    'D:/Nat Cat Platform/FloodData/HK_FloodData/HK_FloodMap_2026-07': 'HK_FLOOD_DATA_DIR',
}

# 相对子目录(在 path 匹配后拼接)
SUBDIR_MAP = {
    'D:/Nat Cat Platform/Data/Shapefile/HongKong_Administrative_Levels': ('SHAPEFILE_DIR', 'HongKong_Administrative_Levels'),
    'D:/web-flood-insurance-model/Data/Shapefile/gadm_410.gpkg': ('GADM_DATA_DIR', 'gadm_410.gpkg'),
    'D:/Nat Cat Platform/Data/Shapefile/澳门统计区_WGS84坐标/澳门统计区（WGS84坐标系）.shp':
        ('SHAPEFILE_DIR', '澳门统计区_WGS84坐标/澳门统计区（WGS84坐标系）.shp'),
    'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK/2412 巨災統計-承保信息 (香港地區).xlsx':
        ('TPHK_DATA_DIR', '2412 巨災統計-承保信息 (香港地區).xlsx'),
    'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK/2412 巨災統計-理赔信息 (香港地區).xlsx':
        ('TPHK_DATA_DIR', '2412 巨災統計-理赔信息 (香港地區).xlsx'),
    'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPMO/承保信息.xlsx':
        ('TPMO_DATA_DIR', '承保信息.xlsx'),
}

PYTHON_FILES = [
    'count-macau-areas.py',
    'scripts/analyze-tphk-data.py',
    'scripts/batch-publish-geoserver.py',
    'scripts/check-environment.py',
    'scripts/enrich-portfolio-with-hierarchy.py',
    'scripts/extract-gadm-country.py',
    'scripts/fix-hk-historical-nativeformat.py',
    'scripts/generate-geospatial-statistics-by-year-fixed.py',
    'scripts/generate-geospatial-statistics-by-year.py',
    'scripts/geocode-tphk-enhanced.py',
    'scripts/geocode-tphk-portfolio.py',
    'scripts/geocode-tpmo-enhanced.py',
    'scripts/geocode-tpmo-portfolio.py',
    'scripts/geocode_tphk_subset.py',
    'scripts/inspect-tphk-insurance-data.py',
    'scripts/parse-macau-insurance-data.py',
    'scripts/plot_hk_flood_maps.py',
    'scripts/portfolio_management/check_claims_structure.py',
    'scripts/portfolio_management/data_processing/01_geocode_full.py',
    'scripts/portfolio_management/data_processing/04_generate_geojson.py',
    'scripts/portfolio_management/data_processing/geocode_claims.py',
    'scripts/portfolio_management/quick_check_claims.py',
    'scripts/publish-ibtracs.py',
    'scripts/quick-inspect-tphk.py',
]

JS_FILES = [
    'analyze-tphk-quick.js',
    'analyze-tphk.js',
    'process-tpmo-full.js',
    'scripts/inspect-gpkg.js',
]

# 匹配 Path(r"D:\...") 或 Path("D:/...") 等所有正反斜杠形式
PATH_CALL_RE = re.compile(
    r'Path\(\s*(r?)"D:[\\/]([^"]+)"\s*\)'
)

# 匹配 const X = 'D:/...' 形式(JS)
JS_CONST_RE = re.compile(
    r"((?:const|let|var)\s+\w+\s*=\s*)(['\"])D:[\\/]([^'\"]+)\2"
)


def normalize_separator(path_after_drive: str) -> str:
    """把 \\ 替换为 /,便于 lookup。"""
    return path_after_drive.replace('\\', '/')


def replace_python(content: str) -> tuple[str, bool]:
    """替换 Python 文件里的硬编码数据目录。返回 (新内容, 是否修改)。"""
    changed = False
    needs_import_os = False

    def repl(m: re.Match) -> str:
        nonlocal changed, needs_import_os
        raw = m.group(1) or ''  # 'r' 或 ''
        path_after = m.group(2)
        normalized = normalize_separator(path_after)
        full_key = 'D:/' + normalized

        # 优先匹配 SUBDIR_MAP,其次 PATH_MAP
        if full_key in SUBDIR_MAP:
            env_var, subdir = SUBDIR_MAP[full_key]
            subdir_esc = subdir.replace('\\', '\\\\') if raw else subdir
            quote = 'r"' if raw else '"'
            subdir_in_repl = f'r"{subdir}"' if raw else f'"{subdir}"'
            changed = True
            needs_import_os = True
            return f'Path(os.getenv("{env_var}", "")) / {subdir_in_repl}'

        if full_key in PATH_MAP:
            env_var = PATH_MAP[full_key]
            original = f'D:{"/" if "/" in path_after else chr(92)}{path_after}'
            original_esc = original.replace('\\', '\\\\') if raw else original
            quote = 'r"' if raw else '"'
            changed = True
            needs_import_os = True
            return f'Path(os.getenv("{env_var}", {quote}{original}{quote}))'

        return m.group(0)

    new_content = PATH_CALL_RE.sub(repl, content)
    if not changed:
        return content, False

    # 添加 import os
    if needs_import_os and 'import os' not in new_content and 'from os' not in new_content:
        m = re.search(r'^(import\s+\S+|from\s+\S+\s+import\s+.*)$', new_content, re.MULTILINE)
        if m:
            new_content = new_content[:m.end()] + '\nimport os' + new_content[m.end():]
        else:
            new_content = 'import os\n' + new_content

    return new_content, True


def replace_js(content: str) -> tuple[str, bool]:
    changed = False

    def repl(m: re.Match) -> str:
        nonlocal changed
        prefix = m.group(1)
        quote = m.group(2)
        path_after = m.group(3)
        normalized = normalize_separator(path_after)
        full_key = 'D:/' + normalized

        if full_key in SUBDIR_MAP:
            env_var, subdir = SUBDIR_MAP[full_key]
            changed = True
            return f'{prefix}process.env.{env_var} ? require("path").join(process.env.{env_var}, {quote}{subdir}{quote}) : {quote}D:/{subdir}{quote}'
        if full_key in PATH_MAP:
            env_var = PATH_MAP[full_key]
            original = 'D:/' + normalized
            changed = True
            return f'{prefix}process.env.{env_var} || {quote}{original}{quote}'
        return m.group(0)

    new_content = JS_CONST_RE.sub(repl, content)
    return new_content, changed


def main() -> int:
    modified_count = 0
    for rel_path in PYTHON_FILES:
        p = PROJECT_ROOT / rel_path
        if not p.exists():
            print(f'[SKIP] {rel_path}')
            continue
        original = p.read_text(encoding='utf-8')
        new_content, changed = replace_python(original)
        if changed:
            p.write_text(new_content, encoding='utf-8')
            modified_count += 1
            print(f'[OK] {rel_path}')
        else:
            print(f'[NOOP] {rel_path}')

    for rel_path in JS_FILES:
        p = PROJECT_ROOT / rel_path
        if not p.exists():
            print(f'[SKIP] {rel_path}')
            continue
        original = p.read_text(encoding='utf-8')
        new_content, changed = replace_js(original)
        if changed:
            p.write_text(new_content, encoding='utf-8')
            modified_count += 1
            print(f'[OK] {rel_path}')
        else:
            print(f'[NOOP] {rel_path}')

    print(f'\nModified {modified_count} files.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())