"""
提取geocoding成功的记录，用于后续开发
只保留有有效坐标的记录
"""
import json
import sys
import io
from pathlib import Path

# Set UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# File paths
INPUT_FILE = Path(__file__).parent.parent / 'output' / 'tphk-geocoded-full.json'
OUTPUT_FILE = Path(__file__).parent.parent / 'output' / 'tphk-geocoded-success.json'
PUBLIC_FILE = Path(__file__).parent.parent.parent.parent / 'public' / 'data' / 'tphk-geocoded-portfolio.json'

print("=" * 70)
print("提取Geocoding成功的记录")
print("=" * 70)
print()

# Load full dataset
print(f"Loading: {INPUT_FILE}")
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total records: {len(data):,}")
print()

# Filter successful geocoding records
print("Filtering successful geocoding records...")
success_records = []
failed_records = []

for record in data:
    # Check if has valid coordinates
    location = record.get('location')
    if location and location.get('lat') and location.get('lng'):
        # Validate coordinates are in reasonable range for Hong Kong
        lat = location['lat']
        lng = location['lng']

        # Hong Kong coordinates: ~22.15-22.58 N, 113.83-114.43 E
        # Allow some buffer for nearby areas
        if 21.5 <= lat <= 23.0 and 113.5 <= lng <= 115.0:
            success_records.append(record)
        else:
            # Invalid coordinates (like the Australia one we saw)
            failed_records.append({
                'policy_id': record.get('policy_id'),
                'address': record.get('address'),
                'lat': lat,
                'lng': lng,
                'reason': 'coordinates_out_of_range'
            })
    else:
        failed_records.append({
            'policy_id': record.get('policy_id'),
            'address': record.get('address'),
            'reason': 'no_coordinates'
        })

print(f"Success: {len(success_records):,} ({len(success_records)/len(data)*100:.1f}%)")
print(f"Failed: {len(failed_records):,} ({len(failed_records)/len(data)*100:.1f}%)")
print()

# Year distribution of success records
from collections import Counter
from datetime import datetime

years = []
for record in success_records:
    policy_start = record.get('保單起期') or record.get('policy_start')
    if policy_start:
        try:
            dt = datetime.strptime(str(policy_start)[:10], '%Y-%m-%d')
            years.append(dt.year)
        except:
            pass

year_counts = Counter(years)
print("Year distribution (success records):")
for year in sorted(year_counts.keys()):
    print(f"  {year}: {year_counts[year]:,}")
print()

# Save success records
print(f"Saving success records to: {OUTPUT_FILE}")
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(success_records, f, ensure_ascii=False, indent=2)

file_size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
print(f"Saved: {file_size_mb:.1f} MB")
print()

# Also copy to public/data for frontend access
print(f"Copying to public folder: {PUBLIC_FILE}")
PUBLIC_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(PUBLIC_FILE, 'w', encoding='utf-8') as f:
    json.dump(success_records, f, ensure_ascii=False, indent=2)

print(f"Public file size: {PUBLIC_FILE.stat().st_size / 1024 / 1024:.1f} MB")
print()

# Save failed records for reference
failed_file = OUTPUT_FILE.parent / 'tphk-geocoding-failed.json'
print(f"Saving failed records to: {failed_file}")
with open(failed_file, 'w', encoding='utf-8') as f:
    json.dump(failed_records, f, ensure_ascii=False, indent=2)

print()
print("=" * 70)
print("Summary")
print("=" * 70)
print(f"Total input: {len(data):,}")
print(f"Geocoding success: {len(success_records):,} ({len(success_records)/len(data)*100:.1f}%)")
print(f"Failed/Invalid: {len(failed_records):,}")
print()
print("Files created:")
print(f"  1. {OUTPUT_FILE.name} - Success records")
print(f"  2. {PUBLIC_FILE.name} - Public copy")
print(f"  3. {failed_file.name} - Failed records log")
print()
print("Next step: Load success records to PostgreSQL")
