"""
Enrich Portfolio Data with Geographic Hierarchy (SPU, TPU, Subunit)
Uses spatial matching to add geographic unit IDs to each policy record
"""

import json
import os
import geopandas as gpd
from pathlib import Path
from shapely.geometry import Point
import sys

print("🔄 Enriching Portfolio Data with Geographic Hierarchy...\n")

# Base paths
base_dir = Path(__file__).parent.parent
data_dir = base_dir / "public" / "data"
by_year_dir = data_dir / "by-year"

# Load shapefiles
shapefile_base = Path(os.getenv("SHAPEFILE_DIR", "")) / "HongKong_Administrative_Levels"
shapefiles = {
    'spu': shapefile_base / "HongKong_SPU_52_polygon.shp",
    'tpu': shapefile_base / "HongKong_TPU_292_polygon.shp",
    'subunit': shapefile_base / "HongKong_Subunit_4916_polygon.shp",
}

def load_shapefile(path, level):
    """Load and prepare shapefile with CRS transformation"""
    if not path.exists():
        print(f"   ⚠️  Shapefile not found: {path}")
        return None

    print(f"   📂 Loading {level.upper()} shapefile...")
    gdf = gpd.read_file(path)

    # Transform to WGS84 (EPSG:4326)
    if gdf.crs != "EPSG:4326":
        print(f"   🔄 Transforming {level.upper()} to WGS84...")
        gdf = gdf.to_crs("EPSG:4326")

    print(f"   ✅ Loaded {len(gdf)} {level.upper()} units")
    return gdf

def enrich_portfolio(portfolio_data, gdfs):
    """Add SPU, TPU, Subunit fields to each policy"""
    enriched = 0
    processed = 0

    for record in portfolio_data:
        processed += 1
        if processed % 1000 == 0:
            print(f"      Processed {processed}/{len(portfolio_data)} (enriched {enriched})...", end='\r')

        # Get coordinates
        loc = record.get('location')
        if not loc or 'lat' not in loc or 'lng' not in loc:
            continue

        point = Point(loc['lng'], loc['lat'])

        # Match to each level
        matched_any = False

        for level, gdf in gdfs.items():
            # Find containing polygon
            possible_matches_idx = list(gdf.sindex.intersection(point.bounds))

            for idx in possible_matches_idx:
                if gdf.iloc[idx].geometry.contains(point):
                    row = gdf.iloc[idx]

                    # Add field based on level
                    if level == 'spu':
                        record['SPU'] = int(row.get('SPU', idx))
                    elif level == 'tpu':
                        record['TPU'] = int(row.get('TPU', row.get('ID', idx)))
                    elif level == 'subunit':
                        record['Subunit'] = int(row.get('Subunit', row.get('SUBUNIT', row.get('ID', idx))))

                    matched_any = True
                    break

        if matched_any:
            enriched += 1

    print(f"\n   ✅ Enriched {enriched}/{processed} policies")
    return portfolio_data

def main():
    years = [2021, 2022, 2023, 2024]

    print(f"📊 Processing years: {', '.join(map(str, years))}\n")

    # Load shapefiles
    print("📂 Loading shapefiles...")
    gdfs = {}
    for level, path in shapefiles.items():
        gdf = load_shapefile(path, level)
        if gdf is not None:
            gdfs[level] = gdf

    if not gdfs:
        print("❌ No shapefiles found.")
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

        # Enrich data
        print(f"   🔄 Enriching with geographic hierarchy...")
        enriched_data = enrich_portfolio(portfolio_data, gdfs)

        # Save enriched data
        output_path = by_year_dir / f"tphk-portfolio-{year}.json"
        print(f"   💾 Saving enriched data...")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(enriched_data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ Saved: {output_path.name}")

    # Also enrich main file
    print(f"\n🗓️  Processing Main Portfolio File...")
    main_path = data_dir / "tphk-geocoded-portfolio.json"
    if main_path.exists():
        print(f"   📂 Loading main portfolio data...")
        with open(main_path, 'r', encoding='utf-8') as f:
            main_data = json.load(f)
        print(f"   ✅ Loaded {len(main_data)} records")

        print(f"   🔄 Enriching with geographic hierarchy...")
        enriched_main = enrich_portfolio(main_data, gdfs)

        print(f"   💾 Saving enriched main file...")
        with open(main_path, 'w', encoding='utf-8') as f:
            json.dump(enriched_main, f, ensure_ascii=False, indent=2)
        print(f"   ✅ Saved: {main_path.name}")

    print("\n✨ Done! Portfolio data enriched with geographic hierarchy.")
    print("\n📝 Next steps:")
    print("   1. Refresh your browser to reload the data")
    print("   2. Search for policies - they should now show in Subunit view")

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
