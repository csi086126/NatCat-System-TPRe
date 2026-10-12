"""Inspect and plot the Hong Kong flood GeoTIFF datasets.

Run this file directly in Spyder. It creates one PNG per GeoTIFF and a CSV
inventory containing raster resolution, CRS, extent, NoData, and depth values.

Required packages:
    conda install -c conda-forge rasterio matplotlib numpy
"""

from __future__ import annotations
import os

import csv
import re
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import rasterio
from matplotlib.colors import BoundaryNorm, ListedColormap


DATA_ROOT = Path(
    os.getenv("HK_FLOOD_DATA_DIR", r"D:\Nat Cat Platform\FloodData\HK_FloodData\HK_FloodMap_2026-07")
    / "HK_FloodMap_2026-07"
)
OUTPUT_ROOT = DATA_ROOT / "plot_output"

# Change to one of: "all", "historical", "compound", or "nontc".
DATASET_TO_PLOT = "all"

# Set to True to avoid redrawing PNG files that already exist.
SKIP_EXISTING = True
FIGURE_DPI = 150

DATASETS = {
    "historical": DATA_ROOT / "Historical_Event",
    "compound": DATA_ROOT / "Typhoon_StormSurge_Compund_Flood",
    "nontc": DATA_ROOT / "NonTyphoon_Rain_Flood",
}

DEPTH_BOUNDS = [0.0, 0.05, 0.15, 0.25, 0.5, 1.0, 1.5, 10000.0]
DEPTH_COLORS = [
    "#ffffff",
    "#d9f0ff",
    "#add8e6",
    "#87ceeb",
    "#6495ed",
    "#4169e1",
    "#00008b",
]
DEPTH_LABELS = [
    "0-0.05",
    "0.05-0.15",
    "0.15-0.25",
    "0.25-0.50",
    "0.50-1.00",
    "1.00-1.50",
    ">1.50",
]
DEPTH_CMAP = ListedColormap(DEPTH_COLORS)
DEPTH_NORM = BoundaryNorm(DEPTH_BOUNDS, DEPTH_CMAP.N)


def selected_datasets() -> dict[str, Path]:
    if DATASET_TO_PLOT == "all":
        return DATASETS
    if DATASET_TO_PLOT not in DATASETS:
        raise ValueError(
            "DATASET_TO_PLOT must be all, historical, compound, or nontc"
        )
    return {DATASET_TO_PLOT: DATASETS[DATASET_TO_PLOT]}


def display_title(dataset: str, path: Path) -> str:
    if dataset == "historical":
        match = re.match(
            r"Case_(\d{4})-(\d{2})-(\d{2})-H(\d{2})_"
            r"(\d{4})-(\d{2})-(\d{2})-H(\d{2})_H(\d+)-maxH$",
            path.stem,
        )
        if match:
            values = match.groups()
            return (
                f"Historical flood: {values[0]}-{values[1]}-{values[2]} "
                f"H{values[3]} to {values[4]}-{values[5]}-{values[6]} "
                f"H{values[7]} ({values[8]} h)"
            )
    if dataset == "compound":
        match = re.match(r"HK_TyphoonR(\d+)_StormR(\d+)$", path.stem)
        if match:
            return (
                f"Typhoon compound flood: typhoon R{match.group(1)} / "
                f"storm surge R{match.group(2)}"
            )
    if dataset == "nontc":
        match = re.match(r"HK_floodMaxDepth_R(\d+)$", path.stem)
        if match:
            return f"Non-typhoon rainfall flood: R{match.group(1)}"
    return path.stem


def valid_depths(masked_depth: np.ma.MaskedArray) -> np.ndarray:
    values = masked_depth.compressed().astype(np.float64, copy=False)
    return values[
        np.isfinite(values)
        & (values > -9990)
        & (values < 10000)
        & (values >= 0)
    ]


def plot_raster(dataset: str, path: Path, output_path: Path) -> dict[str, object]:
    with rasterio.open(path) as source:
        depth = source.read(1, masked=True)
        values = valid_depths(depth)
        bounds = source.bounds
        crs = source.crs.to_string() if source.crs else "MISSING"

        metadata = {
            "dataset": dataset,
            "file": path.name,
            "crs": crs,
            "width_pixels": source.width,
            "height_pixels": source.height,
            "pixel_width": abs(source.transform.a),
            "pixel_height": abs(source.transform.e),
            "left": bounds.left,
            "bottom": bounds.bottom,
            "right": bounds.right,
            "top": bounds.top,
            "nodata": source.nodata,
            "valid_pixel_count": int(values.size),
            "minimum_depth_m": float(values.min()) if values.size else "",
            "mean_depth_m": float(values.mean()) if values.size else "",
            "maximum_depth_m": float(values.max()) if values.size else "",
            "pixels_above_0_15m": int(np.count_nonzero(values > 0.15)),
        }

        if SKIP_EXISTING and output_path.exists():
            return metadata

        # Treat negative values and NoData as transparent. Dry zero-depth cells
        # remain white so the modeled domain can still be inspected.
        display_depth = np.ma.masked_where(depth < 0, depth)
        figure, axis = plt.subplots(figsize=(10, 8), constrained_layout=True)
        try:
            image = axis.imshow(
                display_depth,
                extent=[bounds.left, bounds.right, bounds.bottom, bounds.top],
                origin="upper",
                cmap=DEPTH_CMAP,
                norm=DEPTH_NORM,
                interpolation="nearest",
            )
            axis.set_title(display_title(dataset, path), fontsize=12)
            axis.set_xlabel(f"Easting ({crs})")
            axis.set_ylabel(f"Northing ({crs})")
            axis.set_aspect("equal")
            axis.grid(alpha=0.15, linewidth=0.5)

            colorbar = figure.colorbar(image, ax=axis, fraction=0.035, pad=0.025)
            colorbar.set_ticks([0.025, 0.10, 0.20, 0.375, 0.75, 1.25, 1.75])
            colorbar.set_ticklabels(DEPTH_LABELS)
            colorbar.set_label("Maximum flood depth (m)")

            statistics = (
                f"Resolution: {abs(source.transform.a):.4f} x "
                f"{abs(source.transform.e):.4f} m | "
                f"Valid: {values.size:,} pixels"
            )
            if values.size:
                statistics += (
                    f" | Min/Mean/Max: {values.min():.3f} / "
                    f"{values.mean():.3f} / {values.max():.3f} m"
                )
            axis.text(
                0.5,
                -0.09,
                statistics,
                transform=axis.transAxes,
                ha="center",
                va="top",
                fontsize=8,
            )

            output_path.parent.mkdir(parents=True, exist_ok=True)
            figure.savefig(output_path, dpi=FIGURE_DPI, facecolor="white")
        finally:
            plt.close(figure)
        return metadata


def write_inventory(rows: list[dict[str, object]]) -> Path:
    inventory_path = OUTPUT_ROOT / "raster_inventory.csv"
    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return inventory_path
    with inventory_path.open("w", newline="", encoding="utf-8-sig") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return inventory_path


def main() -> None:
    datasets = selected_datasets()
    missing = [str(path) for path in datasets.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing dataset folders:\n" + "\n".join(missing))

    files_by_dataset = {
        name: sorted(folder.glob("*.tif")) for name, folder in datasets.items()
    }
    print("Hong Kong flood raster inventory")
    for name, files in files_by_dataset.items():
        print(f"  {name}: {len(files)} TIFF files")
    total = sum(len(files) for files in files_by_dataset.values())
    print(f"  total selected: {total} TIFF files")

    rows: list[dict[str, object]] = []
    completed = 0
    for dataset, files in files_by_dataset.items():
        output_folder = OUTPUT_ROOT / dataset
        for path in files:
            completed += 1
            output_path = output_folder / f"{path.stem}.png"
            print(f"[{completed}/{total}] {dataset}: {path.name}")
            try:
                rows.append(plot_raster(dataset, path, output_path))
            except Exception as error:
                print(f"  ERROR: {error}")
                rows.append(
                    {
                        "dataset": dataset,
                        "file": path.name,
                        "crs": "ERROR",
                        "error": str(error),
                    }
                )

    inventory_path = write_inventory(rows)
    failures = sum(row.get("crs") == "ERROR" for row in rows)
    print(f"\nFinished. PNG output: {OUTPUT_ROOT}")
    print(f"Inventory: {inventory_path}")
    print(f"Successful: {len(rows) - failures}; failed: {failures}")


if __name__ == "__main__":
    main()