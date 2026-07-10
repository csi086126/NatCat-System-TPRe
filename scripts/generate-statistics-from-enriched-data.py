"""
Generate Statistics from Enriched Portfolio Data
Uses the Subunit/TPU/SPU fields that were added by the enrichment script
Much faster than spatial matching!
"""

import json
from pathlib import Path
from collections import defaultdict

print("🔄 Generating Statistics from Enriched Data...\n")

# Base paths
base_dir = Path(__file__).parent.parent
data_dir = base_dir / "public" / "data"
stats_dir = data_dir / "statistics"
by_year_dir = data_dir / "by-year"

def generate_statistics_for_level(portfolio_data, level_field):
    """Generate statistics for a geographic level using enriched data"""
    stats = {}

    processed = 0
    matched = 0

    for record in portfolio_data:
        processed += 1
        if processed % 5000 == 0:
            print(f"      Processed {processed}/{len(portfolio_data)} records (matched {matched})...", end='\r')

        # Get the level ID from the enriched field
        unit_id = record.get(level_field)
        if unit_id is None:
            continue

        matched += 1

        # Convert to int for consistency
        unit_id = int(unit_id)
        key = f"{level_field.lower()}_{unit_id}"

        if key not in stats:
            stats[key] = {
                'id': unit_id,
                'name': f"{level_field.upper()} {unit_id}" if level_field != 'District' else unit_id,
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

    print(f"\n   ✅ Matched {matched}/{processed} policies to {level_field} units")

    # Calculate averages
    for key in stats:
        s = stats[key]
        s['avgExposure'] = s['totalExposure'] / s['count'] if s['count'] > 0 else 0
        if s['minExposure'] == float('inf'):
            s['minExposure'] = 0

    return stats

def main():
    years = [2021, 2022, 2023, 2024]
    levels = {
        'spu': 'SPU',
        'tpu': 'TPU',
        'subunit': 'Subunit'
    }

    print(f"📊 Processing years: {', '.join(map(str, years))}")
    print(f"📊 Processing levels: {', '.join(levels.keys())}\n")

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

        # Check if data is enriched
        with_subunit = sum(1 for r in portfolio_data if r.get('Subunit') is not None)
        print(f"   📊 Records with Subunit field: {with_subunit} ({(with_subunit/len(portfolio_data)*100):.1f}%)")

        if with_subunit == 0:
            print(f"   ❌ Data is NOT enriched! Run enrich-portfolio-with-hierarchy.py first")
            continue

        # Process each level
        for level_key, level_field in levels.items():
            print(f"\n   🔄 Processing {level_key.upper()}...")
            stats = generate_statistics_for_level(portfolio_data, level_field)

            # Save statistics
            output_path = stats_dir / f"{level_key}-statistics-{year}.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)
            print(f"   💾 Saved: {output_path.name} ({len(stats)} units)")

    print("\n✨ Done! Statistics generated from enriched data.")
    print("\n📝 Summary:")
    print(f"   Generated year-specific statistics for: {', '.join(levels.keys())}")
    print(f"   Years covered: {', '.join(map(str, years))}")
    print("\n🔄 Next: Refresh your browser to see the updated data!")

if __name__ == '__main__':
    main()
