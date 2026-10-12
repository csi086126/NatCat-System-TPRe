"""Patch HK historical coverage.xml files with the full GeoTIFF configuration.

Coverages created through the GeoServer REST API (POST ``?configure=all``)
are persisted with a minimal configuration that omits the reader-derived
fields GeoServer needs for WCS 1.0.0 GeoTIFF output: ``supportedFormats``,
``dimensions``, ``nativeFormat``, ``metadata.dirName``, ``parameters`` etc.
As a result WCS 1.0.0 rejects ``FORMAT=GeoTIFF`` ("format GeoTIFF is not
supported for this coverage") and DescribeCoverage reports an empty
``rangeType``.

This script rewrites every ``HK_Flood_HistEvent_*`` ``coverage.xml`` on disk
using the fully-configured ``HK_Flood_NONTC_R100`` coverage as a template,
keeping each target's own coverage id and store id.  Run it while the
GeoServer service is STOPPED, then start the service so it reloads the XML.

Run with the ``GeoMet`` conda environment.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

# GeoServer 安装/数据根目录。Windows 默认 C:\ProgramData\GeoServer;Linux/容器下指向挂载的 /opt/geoserver/data。
GEOSERVER_HOME = Path(os.getenv("GEOSERVER_HOME", r"C:\ProgramData\GeoServer"))
WORKSPACE_DIR = GEOSERVER_HOME / "workspaces" / "natcat_platform"
BACKUP_DIR = GEOSERVER_HOME / "backup" / "hk-hist-coverage-xml-backup"
TEMPLATE_STORE = "HK_Flood_NONTC_R100"
PREFIX = "HK_Flood_HistEvent_"


def coverage_xml_path(store: str) -> Path:
    return WORKSPACE_DIR / store / store / "coverage.xml"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Patch HK historical coverage.xml files with the full GeoTIFF configuration."
    )
    parser.add_argument("--dry-run", action="store_true", help="Only report what would change")
    args = parser.parse_args()

    if not WORKSPACE_DIR.is_dir():
        print(f"[ERROR] Workspace dir not found: {WORKSPACE_DIR}", file=sys.stderr)
        return 1

    template_path = coverage_xml_path(TEMPLATE_STORE)
    if not template_path.exists():
        print(f"[ERROR] Template coverage.xml not found: {template_path}", file=sys.stderr)
        return 1
    template = template_path.read_text(encoding="utf-8-sig", errors="replace")
    template_coverage_id = re.search(r"<id>(CoverageInfoImpl-[^<]+)</id>", template)
    template_store_id = re.search(r"<id>(CoverageStoreInfoImpl-[^<]+)</id>", template)
    if not template_coverage_id or not template_store_id:
        print("[ERROR] Cannot extract template ids", file=sys.stderr)
        return 1
    template_coverage_id = template_coverage_id.group(1)
    template_store_id = template_store_id.group(1)

    stores = sorted(
        path.parent.parent.name
        for path in WORKSPACE_DIR.glob(f"{PREFIX}*/*/coverage.xml")
        if path.parent.parent.name.startswith(PREFIX)
    )
    if not stores:
        print(f"[ERROR] No {PREFIX}* coverage.xml found under {WORKSPACE_DIR}", file=sys.stderr)
        return 1
    print(f"Found {len(stores)} HK historical coverages to patch")

    ok = 0
    failed: list[tuple[str, str]] = []
    for index, store in enumerate(stores, 1):
        target_path = coverage_xml_path(store)
        try:
            current = target_path.read_text(encoding="utf-8-sig", errors="replace")
            coverage_id = re.search(r"<id>(CoverageInfoImpl-[^<]+)</id>", current)
            store_id = re.search(r"<id>(CoverageStoreInfoImpl-[^<]+)</id>", current)
            if not coverage_id or not store_id:
                raise RuntimeError("cannot extract target ids")
            coverage_id = coverage_id.group(1)
            store_id = store_id.group(1)

            new_xml = (
                template.replace(TEMPLATE_STORE, store)
                .replace(template_coverage_id, coverage_id)
                .replace(template_store_id, store_id)
            )

            if args.dry_run:
                ok += 1
                continue

            if not BACKUP_DIR.exists():
                BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            backup_target = BACKUP_DIR / store / "coverage.xml"
            backup_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target_path, backup_target)

            target_path.write_text(new_xml, encoding="utf-8", newline="\n")
            ok += 1
        except Exception as error:  # noqa: BLE001
            failed.append((store, str(error)))
        if index % 50 == 0:
            print(f"  [{index}/{len(stores)}] ok={ok} failed={len(failed)}")

    print(f"\nDone. ok={ok} failed={len(failed)}")
    if failed:
        print("FAILED:")
        for store, message in failed[:20]:
            print(f"  {store}: {message}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
