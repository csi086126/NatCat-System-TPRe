"""
加载geocoded成功的TPHK数据到PostgreSQL数据库
"""
import json
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
from pathlib import Path
import sys
import io
from dotenv import load_dotenv
import os

# Set UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

# File path
INPUT_FILE = Path(__file__).parent.parent / 'output' / 'tphk-geocoded-success.json'

def connect_db():
    """Connect to PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(f"Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise

def create_schema_if_needed(conn):
    """Create schema and extensions if not exists"""
    cursor = conn.cursor()

    # Enable PostGIS
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # Create schema
    cursor.execute("CREATE SCHEMA IF NOT EXISTS portfolio;")

    conn.commit()
    cursor.close()
    print("Schema 'portfolio' verified/created")

def load_schema(conn):
    """Load database schema from schema.sql"""
    schema_file = Path(__file__).parent.parent / 'database' / 'schema.sql'

    if not schema_file.exists():
        print(f"Warning: schema.sql not found at {schema_file}")
        return False

    print(f"Loading schema from: {schema_file}")

    cursor = conn.cursor()
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Execute schema
    cursor.execute(schema_sql)
    conn.commit()
    cursor.close()

    print("Schema loaded successfully")
    return True

def parse_date(date_str):
    """Parse date string to datetime object"""
    if not date_str:
        return None

    try:
        # Try parsing datetime string
        if isinstance(date_str, str):
            # Handle '2023-07-15 00:00:00' format
            return datetime.strptime(date_str[:10], '%Y-%m-%d').date()
        return date_str
    except:
        return None

def parse_numeric(value):
    """Parse numeric value, handle NaN and null"""
    if value is None or value == '' or str(value).lower() in ['nan', 'null']:
        return None
    try:
        return float(value)
    except:
        return None

def insert_policies(conn, records):
    """Insert policy records into database"""
    cursor = conn.cursor()

    # Prepare insert query
    # Fields count: 23 Chinese + 23 English + 7 Geocoding + 1 geom = 54 fields
    # But geom uses 2 params (lng, lat), so total params = 53 + 2 = 55
    insert_query = """
    INSERT INTO portfolio.policies (
        -- Chinese fields (23)
        保單號, 巨災代碼, 巨災名稱, 業務類別,
        保單起期, 保單止期, 險種名稱, 承保地區範圍名稱,
        所處洲, 國家或地區, 分區, 保險處所,
        建築等級, 佔用性質, 樓層數, 建造年份,
        保單幣別, 共保前建築重置價值, 共保前室內財物價值,
        共保前總保險金額, 承保份額, 公司保額, 免賠信息,

        -- English fields (23)
        policy_id, event_code, event_name, business_type,
        policy_start, policy_end, coverage_name, coverage_area,
        continent, country, region, address,
        construction_class, occupancy, floors, year_built,
        currency, building_replacement_value, contents_value,
        total_sum_insured_gross, share_percentage, sum_insured, deductible_info,

        -- Geocoding fields (7)
        latitude, longitude, formatted_address, place_id,
        geocoding_provider, geocoding_timestamp, district_source,

        -- PostGIS geometry (1)
        geom
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s,
        ST_SetSRID(ST_MakePoint(%s, %s), 4326)
    )
    ON CONFLICT (保單號) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        geom = EXCLUDED.geom,
        updated_at = CURRENT_TIMESTAMP;
    """

    # Prepare batch data
    batch_data = []

    for record in records:
        location = record.get('location', {})
        lat = location.get('lat')
        lng = location.get('lng')

        if not lat or not lng:
            continue

        # Parse dates
        policy_start = parse_date(record.get('保單起期'))
        policy_end = parse_date(record.get('保單止期'))

        # Parse geocoding timestamp
        geocoding_ts = None
        if location.get('timestamp'):
            try:
                geocoding_ts = datetime.fromisoformat(location['timestamp'].replace('Z', '+00:00'))
            except:
                pass

        # Prepare row data
        row = (
            # Chinese fields
            record.get('保單號'),
            record.get('巨災代碼'),
            record.get('巨災名稱'),
            record.get('業務類別'),
            policy_start,
            policy_end,
            record.get('險種名稱'),
            record.get('承保地區範圍名稱'),
            record.get('所處洲'),
            record.get('國家或地區'),
            record.get('分區'),
            record.get('保險處所'),
            record.get('建築等級'),
            record.get('佔用性質'),
            record.get('樓層數'),
            record.get('建造年份'),
            record.get('保單幣別'),
            parse_numeric(record.get('共保前建築重置價值')),
            parse_numeric(record.get('共保前室內財物價值')),
            parse_numeric(record.get('共保前總保險金額')),
            parse_numeric(record.get('承保份額')),
            parse_numeric(record.get('公司保額')),
            record.get('免賠信息'),

            # English fields
            record.get('policy_id'),
            record.get('event_code'),
            record.get('event_name'),
            record.get('business_type'),
            policy_start,
            policy_end,
            record.get('coverage_name'),
            record.get('coverage_area'),
            record.get('continent'),
            record.get('country'),
            record.get('region'),
            record.get('address'),
            record.get('construction_class'),
            record.get('occupancy'),
            record.get('floors'),
            record.get('year_built'),
            record.get('currency'),
            parse_numeric(record.get('building_replacement_value')),
            parse_numeric(record.get('contents_value')),
            parse_numeric(record.get('total_sum_insured_gross')),
            parse_numeric(record.get('share_percentage')),
            parse_numeric(record.get('sum_insured')),
            record.get('deductible_info'),

            # Geocoding fields
            lat,
            lng,
            location.get('formatted_address'),
            location.get('place_id'),
            location.get('provider'),
            geocoding_ts,
            record.get('district_source'),

            # Geometry (lng, lat for PostGIS)
            lng,
            lat
        )

        batch_data.append(row)

    # Execute batch insert
    print(f"Inserting {len(batch_data):,} records...")
    execute_batch(cursor, insert_query, batch_data, page_size=1000)

    conn.commit()
    cursor.close()

    print(f"Inserted {len(batch_data):,} records successfully")
    return len(batch_data)

def verify_import(conn):
    """Verify imported data"""
    cursor = conn.cursor()

    # Count records
    cursor.execute("SELECT COUNT(*) FROM portfolio.policies;")
    total_count = cursor.fetchone()[0]
    print(f"\nTotal records in database: {total_count:,}")

    # Count by region
    cursor.execute("""
        SELECT region, COUNT(*) as count
        FROM portfolio.policies
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY count DESC
        LIMIT 10;
    """)

    print("\nTop 10 districts by policy count:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]:,}")

    # Year distribution
    cursor.execute("""
        SELECT EXTRACT(YEAR FROM policy_start) as year, COUNT(*) as count
        FROM portfolio.policies
        WHERE policy_start IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM policy_start)
        ORDER BY year;
    """)

    print("\nYear distribution:")
    for row in cursor.fetchall():
        print(f"  {int(row[0])}: {row[1]:,}")

    # Sample spatial query
    cursor.execute("""
        SELECT policy_id, address, region, ST_AsText(geom)
        FROM portfolio.policies
        WHERE geom IS NOT NULL
        LIMIT 3;
    """)

    print("\nSample records with geometry:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[2]} - {row[3]}")

    cursor.close()

def main():
    """Main execution"""
    print("=" * 70)
    print("TPHK Portfolio Data Import to PostgreSQL")
    print("=" * 70)
    print()

    # Load data
    print(f"Loading data from: {INPUT_FILE}")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        records = json.load(f)

    print(f"Loaded {len(records):,} records")
    print()

    # Connect to database
    conn = connect_db()
    print()

    try:
        # Create schema if needed
        create_schema_if_needed(conn)
        print()

        # Load schema (comment out if already created)
        # load_schema(conn)
        # print()

        # Insert policies
        inserted_count = insert_policies(conn, records)
        print()

        # Verify import
        verify_import(conn)
        print()

        print("=" * 70)
        print("Import completed successfully!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("  1. Run: SELECT portfolio.refresh_zone_accumulations();")
        print("  2. Create API endpoints for frontend")
        print("  3. Build Portfolio Dashboard")

    except Exception as e:
        print(f"\nError during import: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
