#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Step 3: Generate Zone Accumulations
计算分区级别的累积统计数据
"""

import os
import sys
import psycopg2
from pathlib import Path
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('03_aggregate.log', encoding='utf-8'),
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


class ZoneAggregator:
    """Calculate zone-level aggregations"""

    def __init__(self):
        """Initialize aggregator"""
        self.conn = None
        self.cursor = None
        self.start_time = datetime.now()

    def connect(self):
        """Connect to database"""
        logger.info("=" * 80)
        logger.info("Connecting to PostgreSQL database...")
        logger.info("=" * 80)

        self.conn = psycopg2.connect(**DB_CONFIG)
        self.cursor = self.conn.cursor()

        logger.info("✓ Connected successfully")

    def calculate_zone_accumulations(self):
        """Calculate zone accumulations using stored function"""
        logger.info("=" * 80)
        logger.info("Calculating zone accumulations...")
        logger.info("=" * 80)

        # Call the stored function
        logger.info("Calling portfolio.refresh_zone_accumulations()...")
        self.cursor.execute("SELECT portfolio.refresh_zone_accumulations();")
        self.conn.commit()

        logger.info("✓ Zone accumulations calculated")

    def calculate_additional_metrics(self):
        """Calculate additional zone-level metrics"""
        logger.info("=" * 80)
        logger.info("Calculating additional metrics...")
        logger.info("=" * 80)

        # Update coverage breakdown
        logger.info("Calculating coverage breakdown by zone...")
        self.cursor.execute("""
            UPDATE portfolio.zone_accumulations za
            SET coverage_breakdown = (
                SELECT jsonb_object_agg(coverage_name, count)
                FROM (
                    SELECT
                        coverage_name,
                        COUNT(*) as count
                    FROM portfolio.policies p
                    WHERE p.region = za.region
                    GROUP BY coverage_name
                ) sub
            )
        """)
        self.conn.commit()
        logger.info("✓ Coverage breakdown calculated")

        # Update construction breakdown
        logger.info("Calculating construction class breakdown by zone...")
        self.cursor.execute("""
            UPDATE portfolio.zone_accumulations za
            SET construction_breakdown = (
                SELECT jsonb_object_agg(construction_class, count)
                FROM (
                    SELECT
                        construction_class,
                        COUNT(*) as count
                    FROM portfolio.policies p
                    WHERE p.region = za.region
                    GROUP BY construction_class
                ) sub
            )
        """)
        self.conn.commit()
        logger.info("✓ Construction breakdown calculated")

        # Calculate concentration ratio
        logger.info("Calculating concentration ratios...")
        self.cursor.execute("""
            UPDATE portfolio.zone_accumulations
            SET concentration_ratio = CASE
                WHEN total_sum_insured > 0 THEN
                    max_single_risk / total_sum_insured
                ELSE 0
            END
        """)
        self.conn.commit()
        logger.info("✓ Concentration ratios calculated")

    def verify_aggregations(self):
        """Verify aggregation results"""
        logger.info("=" * 80)
        logger.info("Verifying aggregations...")
        logger.info("=" * 80)

        # Count zones
        self.cursor.execute("SELECT COUNT(*) FROM portfolio.zone_accumulations;")
        zone_count = self.cursor.fetchone()[0]
        logger.info(f"✓ Total zones: {zone_count}")

        # Top zones by exposure
        self.cursor.execute("""
            SELECT
                region,
                total_sum_insured,
                policy_count,
                max_single_risk,
                concentration_ratio
            FROM portfolio.zone_accumulations
            ORDER BY total_sum_insured DESC
            LIMIT 10;
        """)
        top_zones = self.cursor.fetchall()

        logger.info("\nTop 10 zones by Total Sum Insured:")
        logger.info("-" * 80)
        logger.info(f"{'Zone':<15} {'TSI':>15} {'Policies':>10} {'Max Risk':>15} {'Conc.':>8}")
        logger.info("-" * 80)
        for zone, tsi, count, max_risk, conc in top_zones:
            logger.info(f"{zone:<15} {tsi:>15,.0f} {count:>10,} {max_risk:>15,.0f} {conc:>7.1%}")

        # Overall statistics
        self.cursor.execute("""
            SELECT
                SUM(total_sum_insured) as total_tsi,
                SUM(policy_count) as total_policies,
                AVG(avg_sum_insured) as avg_tsi,
                MAX(max_single_risk) as largest_risk
            FROM portfolio.zone_accumulations;
        """)
        overall = self.cursor.fetchone()

        logger.info("\n" + "=" * 80)
        logger.info("Overall Portfolio Statistics:")
        logger.info("=" * 80)
        logger.info(f"Total Sum Insured:          {overall[0]:,.0f}")
        logger.info(f"Total Policies:             {overall[1]:,}")
        logger.info(f"Average TSI per policy:     {overall[2]:,.0f}")
        logger.info(f"Largest single risk:        {overall[3]:,.0f}")
        logger.info("=" * 80)

    def create_event_statistics(self):
        """Create event-level statistics"""
        logger.info("=" * 80)
        logger.info("Creating event statistics...")
        logger.info("=" * 80)

        # Clear existing event data
        self.cursor.execute("TRUNCATE TABLE portfolio.events RESTART IDENTITY;")

        # Insert event statistics
        self.cursor.execute("""
            INSERT INTO portfolio.events (
                event_code,
                event_name,
                event_type,
                event_start_date,
                affected_regions,
                total_exposure,
                affected_policies_count
            )
            SELECT
                event_code,
                event_name,
                '台风' as event_type,
                MIN(policy_start) as event_start_date,
                jsonb_agg(DISTINCT region) FILTER (WHERE region IS NOT NULL) as affected_regions,
                SUM(sum_insured) as total_exposure,
                COUNT(*) as affected_policies_count
            FROM portfolio.policies
            WHERE event_code IS NOT NULL
            GROUP BY event_code, event_name
            ORDER BY event_code;
        """)
        self.conn.commit()

        # Verify events
        self.cursor.execute("SELECT COUNT(*) FROM portfolio.events;")
        event_count = self.cursor.fetchone()[0]
        logger.info(f"✓ Created statistics for {event_count} events")

        # Show top events
        self.cursor.execute("""
            SELECT
                event_name,
                total_exposure,
                affected_policies_count
            FROM portfolio.events
            ORDER BY total_exposure DESC
            LIMIT 5;
        """)
        top_events = self.cursor.fetchall()

        logger.info("\nTop 5 events by exposure:")
        for event_name, exposure, count in top_events:
            logger.info(f"  - {event_name}: {exposure:,.0f} ({count:,} policies)")

    def print_final_stats(self):
        """Print final statistics"""
        elapsed = (datetime.now() - self.start_time).total_seconds()

        logger.info("=" * 80)
        logger.info("Aggregation Statistics")
        logger.info("=" * 80)
        logger.info(f"Processing time:            {elapsed:.2f} seconds")
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
    logger.info("Zone Accumulation and Event Statistics Generation")
    logger.info("=" * 80)

    aggregator = ZoneAggregator()

    try:
        # Connect to database
        aggregator.connect()

        # Calculate zone accumulations
        aggregator.calculate_zone_accumulations()

        # Calculate additional metrics
        aggregator.calculate_additional_metrics()

        # Verify results
        aggregator.verify_aggregations()

        # Create event statistics
        aggregator.create_event_statistics()

        # Print statistics
        aggregator.print_final_stats()

        logger.info("")
        logger.info("✅ Aggregation completed successfully!")
        logger.info("")
        logger.info("Next step:")
        logger.info("  python data_processing/04_generate_geojson.py")
        logger.info("")

        return 0

    except Exception as e:
        logger.error(f"Aggregation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        aggregator.close()


if __name__ == '__main__':
    sys.exit(main())
