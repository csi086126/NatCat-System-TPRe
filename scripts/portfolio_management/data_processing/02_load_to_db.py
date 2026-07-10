#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Step 2: Load Geocoded Data to PostgreSQL
将geocoding结果导入PostgreSQL数据库
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('02_load_to_db.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

# File paths
OUTPUT_DIR = Path(__file__).parent.parent / 'output'
GEOCODED_FILE = OUTPUT_DIR / 'tphk-geocoded-full.json'


class DatabaseLoader:
    """Load geocoded data into PostgreSQL"""

    def __init__(self):
        """Initialize loader"""
        self.conn = None
        self.cursor = None
        self.stats = {
            'total_records': 0,
            'inserted': 0,
            'failed': 0,
            'has_coordinates': 0
        }
        self.start_time = datetime.now()

    def connect(self):
        """Connect to database"""
        logger.info("=" * 80)
        logger.info("Connecting to PostgreSQL database...")
        logger.info("=" * 80)
        logger.info(f"Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        logger.info(f"Database: {DB_CONFIG['database']}")

        self.conn = psycopg2.connect(**DB_CONFIG)
        self.cursor = self.conn.cursor()

        logger.info("✓ Connected successfully")

    def load_geocoded_data(self, file_path: Path):
        """Load geocoded JSON data"""
        logger.info("=" * 80)
        logger.info("Loading geocoded data...")
        logger.info("=" * 80)
        logger.info(f"File: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        logger.info(f"✓ Loaded {len(data)} records")
        return data

    def insert_policies(self, policies: list):
        """Insert policies into database"""
        logger.info("=" * 80)
        logger.info("Inserting policies into database...")
        logger.info("=" * 80)

        # Clear existing data
        logger.info("Truncating existing data...")
        self.cursor.execute("TRUNCATE TABLE portfolio.policies RESTART IDENTITY CASCADE;")
        self.conn.commit()
        logger.info("✓ Table truncated")

        # Prepare insert statement
        insert_sql = """
            INSERT INTO portfolio.policies (
                -- 中文字段
                保單號, 巨災代碼, 巨災名稱, 業務類別, 保單起期, 保單止期,
                險種名稱, 承保地區範圍名稱, 所處洲, 國家或地區, 分區,
                保險處所, 建築等級, 佔用性質, 樓層數, 建造年份,
                保單幣別, 共保前建築重置價值, 共保前室內財物價值,
                共保前總保險金額, 承保份額, 公司保額, 免賠信息,

                -- 英文字段
                policy_id, event_code, event_name, business_type,
                policy_start, policy_end, coverage_name, coverage_area,
                continent, country, region, address,
                construction_class, occupancy, floors, year_built,
                currency, building_replacement_value, contents_value,
                total_sum_insured_gross, share_percentage, sum_insured,
                deductible_info,

                -- Geocoding结果
                latitude, longitude, formatted_address, place_id,
                geocoding_provider, geocoding_timestamp, district_source,

                -- PostGIS几何对象
                geom
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)
            )
        """

        batch_size = 100
        batch_data = []

        for idx, policy in enumerate(policies):
            self.stats['total_records'] += 1

            try:
                # Extract location data
                location = policy.get('location', {})
                lat = location.get('lat')
                lng = location.get('lng')

                if lat and lng:
                    self.stats['has_coordinates'] += 1

                # Prepare row data
                row_data = (
                    # 中文字段
                    policy.get('保單號'),
                    policy.get('巨災代碼'),
                    policy.get('巨災名稱'),
                    policy.get('業務類別'),
                    policy.get('保單起期'),
                    policy.get('保單止期'),
                    policy.get('險種名稱'),
                    policy.get('承保地區範圍名稱'),
                    policy.get('所處洲'),
                    policy.get('國家或地區'),
                    policy.get('分區'),
                    policy.get('保險處所'),
                    policy.get('建築等級'),
                    policy.get('佔用性質'),
                    policy.get('樓層數'),
                    policy.get('建造年份'),
                    policy.get('保單幣別'),
                    policy.get('共保前建築重置價值'),
                    policy.get('共保前室內財物價值'),
                    policy.get('共保前總保險金額'),
                    policy.get('承保份額'),
                    policy.get('公司保額'),
                    policy.get('免賠信息'),

                    # 英文字段
                    policy.get('policy_id'),
                    policy.get('event_code'),
                    policy.get('event_name'),
                    policy.get('business_type'),
                    policy.get('policy_start'),
                    policy.get('policy_end'),
                    policy.get('coverage_name'),
                    policy.get('coverage_area'),
                    policy.get('continent'),
                    policy.get('country'),
                    policy.get('region'),
                    policy.get('address'),
                    policy.get('construction_class'),
                    policy.get('occupancy'),
                    policy.get('floors'),
                    policy.get('year_built'),
                    policy.get('currency'),
                    policy.get('building_replacement_value'),
                    policy.get('contents_value'),
                    policy.get('total_sum_insured_gross'),
                    policy.get('share_percentage'),
                    policy.get('sum_insured'),
                    policy.get('deductible_info'),

                    # Geocoding结果
                    lat,
                    lng,
                    location.get('formatted_address'),
                    location.get('place_id'),
                    location.get('provider'),
                    location.get('timestamp'),
                    policy.get('district_source'),

                    # Geometry (lng, lat for PostGIS)
                    lng,
                    lat
                )

                batch_data.append(row_data)

                # Execute batch insert
                if len(batch_data) >= batch_size:
                    self._execute_batch(insert_sql, batch_data)
                    batch_data = []

                # Progress indicator
                if (idx + 1) % 1000 == 0:
                    progress = (idx + 1) / len(policies) * 100
                    logger.info(f"Progress: {idx + 1}/{len(policies)} ({progress:.1f}%)")

            except Exception as e:
                logger.error(f"Failed to process record {idx + 1}: {e}")
                self.stats['failed'] += 1

        # Insert remaining batch
        if batch_data:
            self._execute_batch(insert_sql, batch_data)

        self.conn.commit()
        logger.info("✓ All data inserted successfully")

    def _execute_batch(self, sql: str, data: list):
        """Execute batch insert"""
        try:
            for row in data:
                self.cursor.execute(sql, row)
            self.stats['inserted'] += len(data)
        except Exception as e:
            logger.error(f"Batch insert failed: {e}")
            self.stats['failed'] += len(data)
            raise

    def verify_data(self):
        """Verify loaded data"""
        logger.info("=" * 80)
        logger.info("Verifying loaded data...")
        logger.info("=" * 80)

        # Count total records
        self.cursor.execute("SELECT COUNT(*) FROM portfolio.policies;")
        total_count = self.cursor.fetchone()[0]
        logger.info(f"✓ Total records in database: {total_count}")

        # Count records with coordinates
        self.cursor.execute("""
            SELECT COUNT(*)
            FROM portfolio.policies
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """)
        geo_count = self.cursor.fetchone()[0]
        logger.info(f"✓ Records with coordinates: {geo_count} ({geo_count/total_count*100:.1f}%)")

        # Count records by district
        self.cursor.execute("""
            SELECT region, COUNT(*) as count
            FROM portfolio.policies
            WHERE region IS NOT NULL AND region != ''
            GROUP BY region
            ORDER BY count DESC
            LIMIT 10;
        """)
        districts = self.cursor.fetchall()
        logger.info("\nTop 10 districts by policy count:")
        for district, count in districts:
            logger.info(f"  - {district}: {count:,} policies")

        # Sum of total sum insured
        self.cursor.execute("""
            SELECT
                SUM(sum_insured) as total_tsi,
                SUM(total_sum_insured_gross) as total_gross
            FROM portfolio.policies;
        """)
        tsi_sum = self.cursor.fetchone()
        if tsi_sum[0]:
            logger.info(f"\n✓ Total Sum Insured (Net): {tsi_sum[0]:,.0f}")
            logger.info(f"✓ Total Sum Insured (Gross): {tsi_sum[1]:,.0f}")

    def print_final_stats(self):
        """Print final statistics"""
        elapsed = (datetime.now() - self.start_time).total_seconds()

        logger.info("=" * 80)
        logger.info("Database Loading Statistics")
        logger.info("=" * 80)
        logger.info(f"Total records processed:    {self.stats['total_records']}")
        logger.info(f"Successfully inserted:      {self.stats['inserted']}")
        logger.info(f"Failed:                     {self.stats['failed']}")
        logger.info(f"Records with coordinates:   {self.stats['has_coordinates']}")
        logger.info(f"Processing time:            {elapsed/60:.1f} minutes")
        logger.info(f"Average rate:               {self.stats['inserted']/elapsed:.2f} records/second")
        logger.info("=" * 80)

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("✓ Database connection closed")


def main():
    """Main entry point"""
    logger.info("=" * 80)
    logger.info("TPHK Data Loading to PostgreSQL")
    logger.info("=" * 80)

    if not GEOCODED_FILE.exists():
        logger.error(f"Geocoded file not found: {GEOCODED_FILE}")
        logger.error("Please run 01_geocode_full.py first!")
        return 1

    loader = DatabaseLoader()

    try:
        # Connect to database
        loader.connect()

        # Load geocoded data
        policies = loader.load_geocoded_data(GEOCODED_FILE)

        # Insert into database
        loader.insert_policies(policies)

        # Verify data
        loader.verify_data()

        # Print statistics
        loader.print_final_stats()

        logger.info("")
        logger.info("✅ Data loading completed successfully!")
        logger.info("")
        logger.info("Next step:")
        logger.info("  python data_processing/03_aggregate.py")
        logger.info("")

        return 0

    except Exception as e:
        logger.error(f"Loading failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        loader.close()


if __name__ == '__main__':
    sys.exit(main())
