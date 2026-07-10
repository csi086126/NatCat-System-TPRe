"""
Test geospatial processing
"""
import json
from pathlib import Path

print("Testing geospatial setup...\n")

# Check imports
try:
    import geopandas as gpd
    print("✅ geopandas imported successfully")
except ImportError as e:
    print(f"❌ Failed to import geopandas: {e}")
    exit(1)

try:
    from shapely.geometry import Point
    print("✅ shapely imported successfully")
except ImportError as e:
    print(f"❌ Failed to import shapely: {e}")
    exit(1)

# Check shapefile
shapefile_path = Path("D:/Nat Cat Platform/Data/Shapefile/HongKong_Administrative_Levels/HongKong_SPU_52_polygon.shp")
print(f"\nChecking shapefile: {shapefile_path}")
print(f"Exists: {shapefile_path.exists()}")

if shapefile_path.exists():
    try:
        gdf = gpd.read_file(shapefile_path)
        print(f"✅ Loaded shapefile: {len(gdf)} features")
        print(f"Columns: {list(gdf.columns)}")
        print(f"Sample feature:\n{gdf.iloc[0]}")
    except Exception as e:
        print(f"❌ Failed to load shapefile: {e}")
        exit(1)

# Check portfolio data
portfolio_path = Path("D:/Nat Cat Platform/UI_system/public/data/by-year/tphk-portfolio-2024.json")
print(f"\nChecking portfolio: {portfolio_path}")
print(f"Exists: {portfolio_path.exists()}")

if portfolio_path.exists():
    with open(portfolio_path, 'r', encoding='utf-8') as f:
        portfolio = json.load(f)
    print(f"✅ Loaded portfolio: {len(portfolio)} records")

    # Check first record
    if portfolio:
        rec = portfolio[0]
        print(f"Sample record keys: {list(rec.keys())}")
        if 'location' in rec:
            print(f"Location: {rec['location']}")

        # Test point creation
        if 'location' in rec and 'lat' in rec['location'] and 'lng' in rec['location']:
            point = Point(rec['location']['lng'], rec['location']['lat'])
            print(f"✅ Created point: {point}")

            # Test containment
            contained = False
            for idx, row in gdf.iterrows():
                if row.geometry.contains(point):
                    contained = True
                    print(f"✅ Point contained in feature {idx}: {row.get('NAME') or row.get('name')}")
                    break
            if not contained:
                print(f"⚠️  Point not contained in any feature")

print("\n✅ All tests passed!")
