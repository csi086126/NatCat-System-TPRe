"""Assign EPSG:2326 CRS to the Hong Kong historical flood GeoTIFFs.

The 425 ``HK_Flood_HistEvent_*`` rasters under the GeoServer data directory
were published without a CRS, so GeoServer mishandles EPSG:4326 reprojection
(WCS ``GetCoverage`` fails with "bbox is outside of the coverage area" and
WMS renders blank). This script rewrites each GeoTIFF with EPSG:2326
(HK 1980 Grid System) while preserving the pixel values, geotransform,
NoData sentinel and float32 datatype.

Run with the ``GeoMet`` conda environment:
    C:\\Users\\sichen\\AppData\\Local\\anaconda3\\envs\\GeoMet\\python.exe scripts/fix-hk-historical-crs.py
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS

# GeoServer 安装/数据根目录。Windows 默认 C:\ProgramData\GeoServer;Linux/容器下指向挂载的 /opt/geoserver/data。
GEOSERVER_HOME = Path(os.getenv("GEOSERVER_HOME", r"C:\ProgramData\GeoServer"))
DATA_DIR = GEOSERVER_HOME / "data" / "natcat_platform"
BACKUP_DIR = GEOSERVER_HOME / "backup" / "hk-hist-before-crs-fix"
TARGET_EPSG = 2326
TARGET_CRS = CRS.from_epsg(TARGET_EPSG)


def find_historical_geotiffs(data_dir: Path) -> list[Path]:
    return sorted(data_dir.glob("HK_Flood_HistEvent_*/*.geotiff"))


def backup_file(path: Path, backup_dir: Path) -> Path:
    relative = path.relative_to(DATA_DIR)
    target = backup_dir / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(path, target)
    return target


def rewrite_with_crs(path: Path, dry_run: bool = False) -> tuple[bool, str]:
    with rasterio.open(path) as src:
        profile = src.profile.copy()
        profile["driver"] = "GTiff"
        profile["crs"] = TARGET_CRS
        profile["AREA_OR_POINT"] = "Area"
        data = src.read()
        original_crs = src.crs

    if dry_run:
        return True, f"would rewrite ({original_crs})"

    tmp_path = path.with_name(f"{path.name}.crsfix.tmp")
    try:
        with rasterio.open(tmp_path, "w", **profile) as dst:
            dst.write(data)
            dst.update_tags(AREA_OR_POINT="Area")

        with rasterio.open(tmp_path) as check, rasterio.open(path) as original:
            crs_ok = check.crs == TARGET_CRS
            pixels_ok = (
                check.shape == original.shape
                and np.array_equal(check.read(), original.read(), equal_nan=True)
            )
            nodata_ok = check.nodata == original.nodata

        if not (crs_ok and pixels_ok and nodata_ok):
            return False, f"validation failed (crs={crs_ok} px={pixels_ok} nodata={nodata_ok})"

        tmp_path.replace(path)
        return True, "rewritten with EPSG:2326"
    except Exception as error:  # noqa: BLE001 - surface any failure for the summary
        tmp_path.unlink(missing_ok=True)
        return False, str(error)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Assign EPSG:2326 to HK historical flood GeoTIFFs in the GeoServer data directory."
    )
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR,
                        help="GeoServer data/natcat_platform directory")
    parser.add_argument("--backup-dir", type=Path, default=BACKUP_DIR,
                        help="Backup directory for pre-fix files")
    parser.add_argument("--no-backup", action="store_true",
                        help="Skip backing up files before rewriting")
    parser.add_argument("--dry-run", action="store_true",
                        help="List files that would be rewritten without changing anything")
    args = parser.parse_args()

    if not args.data_dir.is_dir():
        print(f"[ERROR] Data directory does not exist: {args.data_dir}", file=sys.stderr)
        return 1

    files = find_historical_geotiffs(args.data_dir)
    print(f"Found {len(files)} HK_Flood_HistEvent_*.geotiff files under {args.data_dir}")
    if args.dry_run:
        print("DRY RUN - no files will be changed")

    ok = 0
    failed: list[tuple[Path, str]] = []
    for index, path in enumerate(files, 1):
        if not args.dry_run and not args.no_backup:
            backup_file(path, args.backup_dir)
        success, message = rewrite_with_crs(path, dry_run=args.dry_run)
        if success:
            ok += 1
        else:
            failed.append((path, message))
        print(f"[{index}/{len(files)}] {path.name}: {'OK' if success else 'FAIL'} - {message}")

    print(f"\nDone. {ok}/{len(files)} {'would be' if args.dry_run else ''} processed.")
    if failed:
        print(f"FAILED ({len(failed)}):")
        for path, message in failed:
            print(f"  {path}: {message}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
