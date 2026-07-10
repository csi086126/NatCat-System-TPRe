#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Step 4: Generate GeoJSON for Frontend
生成前端地图可视化所需的GeoJSON文件
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('04_generate_geojson.log', encoding='utf-8'),
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

# Output directory
PUBLIC_DATA_DIR = Path(r"D:\Nat Cat Platform\UI_system\public\data")
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)


class GeoJSONGenerator:
    """Generate GeoJSON files for frontend visualization"""

    def __init__(self):
        """Initialize generator"""
        self.conn = None
        self.cursor = None
        self.start_time = datetime.now()

    def connect(self):
        """Connect to database"""
        logger.info("=" * 80)
        logger.info("Connecting to PostgreSQL database...")
        logger.info("=" * 80)

        self.conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        self.cursor = self.conn.cursor()

        logger.info("✓ Connected successfully")

    def generate_policies_geojson(self):
        """Generate GeoJSON for all policies with coordinates"""
        logger.info("=" * 80)
        logger.info("Generating policies GeoJSON...")
        logger.info("=" * 80)

        # Query policies with coordinates
        self.cursor.execute("""
            SELECT
                policy_id,
                address,
                region,
                sum_insured,
                total_sum_insured_gross,
                occupancy,
                construction_class,
                floors,
                year_built,
                coverage_name,
                event_name,
                latitude,
                longitude
            FROM portfolio.policies
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY sum_insured DESC;
        """)

        policies = self.cursor.fetchall()
        logger.info(f"Found {len(policies)} policies with coordinates")

        # Build GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }

        for policy in policies:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [policy['longitude'], policy['latitude']]
                },
                "properties": {
                    "policy_id": policy['policy_id'],
                    "address": policy['address'],
                    "region": policy['region'],
                    "sum_insured": float(policy['sum_insured']) if policy['sum_insured'] else 0,
                    "total_sum_insured_gross": float(policy['total_sum_insured_gross']) if policy['total_sum_insured_gross'] else 0,
                    "occupancy": policy['occupancy'],
                    "construction_class": policy['construction_class'],
                    "floors": policy['floors'],
                    "year_built": policy['year_built'],
                    "coverage_name": policy['coverage_name'],
                    "event_name": policy['event_name']
                }
            }
            geojson['features'].append(feature)

        # Save GeoJSON
        output_file = PUBLIC_DATA_DIR / 'tphk-policies.geojson'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Saved: {output_file}")
        logger.info(f"  Features: {len(geojson['features'])}")

        return len(geojson['features'])

    def generate_zone_accumulations_json(self):
        """Generate JSON for zone accumulations"""
        logger.info("=" * 80)
        logger.info("Generating zone accumulations JSON...")
        logger.info("=" * 80)

        # Query zone accumulations
        self.cursor.execute("""
            SELECT
                region,
                total_sum_insured,
                total_sum_insured_gross,
                policy_count,
                avg_sum_insured,
                occupancy_breakdown,
                coverage_breakdown,
                construction_breakdown,
                max_single_risk,
                concentration_ratio,
                earliest_policy_start,
                latest_policy_end
            FROM portfolio.zone_accumulations
            ORDER BY total_sum_insured DESC;
        """)

        zones = self.cursor.fetchall()
        logger.info(f"Found {len(zones)} zones")

        # Convert to JSON-serializable format
        zones_data = []
        for zone in zones:
            zone_dict = dict(zone)
            # Convert dates to strings
            if zone_dict.get('earliest_policy_start'):
                zone_dict['earliest_policy_start'] = zone_dict['earliest_policy_start'].isoformat()
            if zone_dict.get('latest_policy_end'):
                zone_dict['latest_policy_end'] = zone_dict['latest_policy_end'].isoformat()
            # Convert numeric to float
            for key in ['total_sum_insured', 'total_sum_insured_gross', 'avg_sum_insured', 'max_single_risk', 'concentration_ratio']:
                if zone_dict.get(key) is not None:
                    zone_dict[key] = float(zone_dict[key])

            zones_data.append(zone_dict)

        # Save JSON
        output_file = PUBLIC_DATA_DIR / 'tphk-zone-accumulations.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(zones_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Saved: {output_file}")
        logger.info(f"  Zones: {len(zones_data)}")

        return len(zones_data)

    def generate_events_json(self):
        """Generate JSON for catastrophic events"""
        logger.info("=" * 80)
        logger.info("Generating events JSON...")
        logger.info("=" * 80)

        # Query events
        self.cursor.execute("""
            SELECT
                event_code,
                event_name,
                event_type,
                event_start_date,
                affected_regions,
                total_exposure,
                affected_policies_count
            FROM portfolio.events
            ORDER BY total_exposure DESC;
        """)

        events = self.cursor.fetchall()
        logger.info(f"Found {len(events)} events")

        # Convert to JSON-serializable format
        events_data = []
        for event in events:
            event_dict = dict(event)
            if event_dict.get('event_start_date'):
                event_dict['event_start_date'] = event_dict['event_start_date'].isoformat()
            if event_dict.get('total_exposure'):
                event_dict['total_exposure'] = float(event_dict['total_exposure'])

            events_data.append(event_dict)

        # Save JSON
        output_file = PUBLIC_DATA_DIR / 'tphk-events.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(events_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Saved: {output_file}")
        logger.info(f"  Events: {len(events_data)}")

        return len(events_data)

    def generate_heatmap_data(self):
        """Generate heatmap data (lat, lng, intensity)"""
        logger.info("=" * 80)
        logger.info("Generating heatmap data...")
        logger.info("=" * 80)

        # Query for heatmap
        self.cursor.execute("""
            SELECT
                latitude,
                longitude,
                sum_insured
            FROM portfolio.policies
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND sum_insured IS NOT NULL
            ORDER BY sum_insured DESC;
        """)

        points = self.cursor.fetchall()
        logger.info(f"Found {len(points)} points for heatmap")

        # Format as array of [lat, lng, intensity]
        heatmap_data = []
        max_intensity = max([float(p['sum_insured']) for p in points]) if points else 1

        for point in points:
            # Normalize intensity to 0-1 range
            intensity = float(point['sum_insured']) / max_intensity
            heatmap_data.append([
                float(point['latitude']),
                float(point['longitude']),
                intensity
            ])

        # Save JSON
        output_file = PUBLIC_DATA_DIR / 'tphk-heatmap.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(heatmap_data, f, ensure_ascii=False)

        logger.info(f"✓ Saved: {output_file}")
        logger.info(f"  Points: {len(heatmap_data)}")

        return len(heatmap_data)

    def generate_summary_stats(self):
        """Generate summary statistics JSON"""
        logger.info("=" * 80)
        logger.info("Generating summary statistics...")
        logger.info("=" * 80)

        # Overall statistics
        self.cursor.execute("""
            SELECT
                COUNT(*) as total_policies,
                SUM(sum_insured) as total_tsi,
                SUM(total_sum_insured_gross) as total_gross,
                AVG(sum_insured) as avg_tsi,
                MAX(sum_insured) as max_tsi,
                COUNT(DISTINCT region) as total_regions
            FROM portfolio.policies;
        """)
        overall = dict(self.cursor.fetchone())

        # By region
        self.cursor.execute("""
            SELECT
                region,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE region IS NOT NULL
            GROUP BY region
            ORDER BY tsi DESC;
        """)
        by_region = [dict(row) for row in self.cursor.fetchall()]

        # By occupancy
        self.cursor.execute("""
            SELECT
                occupancy,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE occupancy IS NOT NULL
            GROUP BY occupancy
            ORDER BY tsi DESC
            LIMIT 10;
        """)
        by_occupancy = [dict(row) for row in self.cursor.fetchall()]

        # By coverage
        self.cursor.execute("""
            SELECT
                coverage_name,
                COUNT(*) as count,
                SUM(sum_insured) as tsi
            FROM portfolio.policies
            WHERE coverage_name IS NOT NULL
            GROUP BY coverage_name
            ORDER BY tsi DESC;
        """)
        by_coverage = [dict(row) for row in self.cursor.fetchall()]

        # Build summary
        summary = {
            "overall": {
                "total_policies": overall['total_policies'],
                "total_tsi": float(overall['total_tsi']) if overall['total_tsi'] else 0,
                "total_gross": float(overall['total_gross']) if overall['total_gross'] else 0,
                "avg_tsi": float(overall['avg_tsi']) if overall['avg_tsi'] else 0,
                "max_tsi": float(overall['max_tsi']) if overall['max_tsi'] else 0,
                "total_regions": overall['total_regions']
            },
            "by_region": [
                {
                    "region": r['region'],
                    "count": r['count'],
                    "tsi": float(r['tsi']) if r['tsi'] else 0
                }
                for r in by_region
            ],
            "by_occupancy": [
                {
                    "occupancy": o['occupancy'],
                    "count": o['count'],
                    "tsi": float(o['tsi']) if o['tsi'] else 0
                }
                for o in by_occupancy
            ],
            "by_coverage": [
                {
                    "coverage_name": c['coverage_name'],
                    "count": c['count'],
                    "tsi": float(c['tsi']) if c['tsi'] else 0
                }
                for c in by_coverage
            ],
            "last_updated": datetime.now().isoformat()
        }

        # Save JSON
        output_file = PUBLIC_DATA_DIR / 'tphk-summary.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Saved: {output_file}")

    def print_final_stats(self):
        """Print final statistics"""
        elapsed = (datetime.now() - self.start_time).total_seconds()

        logger.info("=" * 80)
        logger.info("GeoJSON Generation Statistics")
        logger.info("=" * 80)
        logger.info(f"Processing time:            {elapsed:.2f} seconds")
        logger.info(f"Output directory:           {PUBLIC_DATA_DIR}")
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
    logger.info("GeoJSON and Data Generation for Frontend")
    logger.info("=" * 80)

    generator = GeoJSONGenerator()

    try:
        # Connect to database
        generator.connect()

        # Generate all data files
        generator.generate_policies_geojson()
        generator.generate_zone_accumulations_json()
        generator.generate_events_json()
        generator.generate_heatmap_data()
        generator.generate_summary_stats()

        # Print statistics
        generator.print_final_stats()

        logger.info("")
        logger.info("✅ GeoJSON generation completed successfully!")
        logger.info("")
        logger.info("Generated files:")
        logger.info(f"  - tphk-policies.geojson       (Map markers)")
        logger.info(f"  - tphk-zone-accumulations.json (Zone statistics)")
        logger.info(f"  - tphk-events.json             (Event data)")
        logger.info(f"  - tphk-heatmap.json            (Heatmap data)")
        logger.info(f"  - tphk-summary.json            (Summary statistics)")
        logger.info("")
        logger.info("Next step:")
        logger.info("  Start API server: cd api && uvicorn main:app --reload")
        logger.info("")

        return 0

    except Exception as e:
        logger.error(f"GeoJSON generation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        generator.close()


if __name__ == '__main__':
    sys.exit(main())
