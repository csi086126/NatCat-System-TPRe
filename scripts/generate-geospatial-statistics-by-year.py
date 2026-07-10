"""
Generate SPU, TPU, and Subunit Statistics by Underwriting Year
Uses geospatial matching (Point-in-Polygon) to assign policies to geographic units
"""

import json
import geopandas as gpd
from pathlib import Path
from shapely.geometry import Point
from collections import defaultdict
import sys

print("🔄 Generating Geospatial Statistics by Underwriting Year...\n")

# Base paths
base_dir = Path(__file__).parent.parent
data_dir = base_dir / "public" / "data"
stats_dir = data_dir / "statistics"
by_year_dir = data_dir / "by-year"

# Load shapefiles from main Data directory
shapefile_base = Path("D:/Nat Cat Platform/Data/Shapefile/HongKong_Administrative_Levels")
shapefiles = {
    'spu': shapefile_base / "HongKong_SPU_52_polygon.shp",
    'tpu': shapefile_base / "HongKong_TPU_292_polygon.shp",
    'subunit': shapefile_base / "HongKong_Subunit_4916_polygon.shp",
}

def load_shapefile(path, level):
    """Load and prepare shapefile"""
    if not path.exists():
        print(f"   ⚠️  Shapefile not found: {path}")
        return None

    print(f"   📂 Loading {level.upper()} shapefile...")
    gdf = gpd.read_file(path)
    print(f"   ✅ Loaded {len(gdf)} {level.upper()} units")
    return gdf

def generate_statistics_for_level(year, portfolio_data, gdf, level):
    """Generate statistics for a geographic level"""
    stats = {}

    # Create spatial index for faster lookups
    print(f"   🔍 Creating spatial index for {level.upper()}...")
    gdf_indexed = gdf.sindex

    processed = 0
    matched = 0

    for record in portfolio_data:
        processed += 1
        if processed % 1000 == 0:
            print(f"      Processed {processed}/{len(portfolio_data)} records...", end='\r')

        # Get coordinates
        loc = record.get('location')
        if not loc or 'lat' not in loc or 'lng' not in loc:
            continue

        point = Point(loc['lng'], loc['lat'])

        # Find containing polygon
        possible_matches_idx = list(gdf_indexed.intersection(point.bounds))
        if not possible_matches_idx:
            continue

        # Check actual containment
        for idx in possible_matches_idx:
            if gdf.iloc[idx].geometry.contains(point):
                matched += 1
                unit_id = gdf.iloc[idx].get('ID') or gdf.iloc[idx].get('id') or idx
                key = f"{level}_{unit_id}"

                if key not in stats:
                    stats[key] = {
                        'id': unit_id,
                        'name': gdf.iloc[idx].get('NAME') or gdf.iloc[idx].get('name') or f"{level.upper()} {unit_id}",
                        'count': 0,
                        'totalExposure': 0,
                        'avgExposure': 0,
                        'minExposure': float('inf'),
                        'maxExposure': 0,
                        'byOccupancy': {},
                        'byYear': {}
                    }

                s = stats[key]
                exposure = record.get('sum_insured') or record.get('公司保額') or 0

                # Update stats
                s['count'] += 1
                s['totalExposure'] += exposure
                if exposure > 0:
                    s['minExposure'] = min(s['minExposure'], exposure)
                    s['maxExposure'] = max(s['maxExposure'], exposure)

                # By occupancy
                occ = record.get('occupancy') or record.get('佔用性質') or 'Unknown'
                if occ not in s['byOccupancy']:
                    s['byOccupancy'][occ] = {'count': 0, 'totalExposure': 0}
                s['byOccupancy'][occ]['count'] += 1
                s['byOccupancy'][occ]['totalExposure'] += exposure

                break  # Found the containing polygon

    print(f"\n   ✅ Matched {matched}/{processed} policies to {level.upper()} units")

    # Calculate averages
    for key in stats:
        s = stats[key]
        s['avgExposure'] = s['totalExposure'] / s['count'] if s['count'] > 0 else 0
        if s['minExposure'] == float('inf'):
            s['minExposure'] = 0

    return stats

def main():
    years = [2021, 2022, 2023, 2024]
    levels = ['spu', 'tpu', 'subunit']

    print(f"📊 Processing years: {', '.join(map(str, years))}")
    print(f"📊 Processing levels: {', '.join(levels)}\n")

    # Load shapefiles
    gdfs = {}
    for level, path in shapefiles.items():
        gdf = load_shapefile(path, level)
        if gdf is not None:
            gdfs[level] = gdf

    if not gdfs:
        print("❌ No shapefiles found. Please ensure shapefiles are in public/data/shapefiles/")
        return

    # Process each year
    for year in years:
        print(f"\n🗓️  Processing Year {year}...")

        portfolio_path = by_year_dir / f"tphk-portfolio-{year}.json"
        if not portfolio_path.exists():
            print(f"   ⚠️  Portfolio file not found: {portfolio_path}")
            continue

        print(f"   📂 Loading portfolio data...")
        with open(portfolio_path, 'r', encoding='utf-8') as f:
            portfolio_data = json.load(f)
        print(f"   ✅ Loaded {len(portfolio_data)} records")

        # Process each level
        for level in levels:
            if level not in gdfs:
                print(f"   ⚠️  Skipping {level.upper()} (shapefile not loaded)")
                continue

            print(f"\n   🔄 Processing {level.upper()}...")
            stats = generate_statistics_for_level(year, portfolio_data, gdfs[level], level)

            # Save statistics
            output_path = stats_dir / f"{level}-statistics-{year}.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)
            print(f"   💾 Saved: {output_path.name}")

    print("\n✨ Done! Geospatial statistics generated.")
    print("\n📝 Note: This script requires shapefiles in public/data/shapefiles/")
    print("   - HongKong_SPU_52_polygon.shp")
    print("   - HongKong_TPU_292_polygon.shp")
    print("   - HongKong_Subunit_4916_polygon.shp")

if __name__ == '__main__':
    try:
        import geopandas
        import shapely
        main()
    except ImportError as e:
        print(f"❌ Error: {e}")
        print("\n📦 Please install required packages:")
        print("   pip install geopandas shapely")
        sys.exit(1)
