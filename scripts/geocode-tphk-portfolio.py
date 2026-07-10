#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TPHK Portfolio Geocoding Script
Processes Taiping Hong Kong insurance data and geocodes addresses
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict
import logging
from dotenv import load_dotenv

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.append(str(script_dir))

from geocoding_service import GeocodingService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tphk-geocoding.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# File paths
DATA_DIR = Path(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK")
POLICY_FILE = DATA_DIR / "2412 巨災統計-承保信息 (香港地區).xlsx"
CLAIM_FILE = DATA_DIR / "2412 巨災統計-理赔信息 (香港地區).xlsx"
OUTPUT_DIR = Path(r"D:\Nat Cat Platform\UI_system\public\data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class TPHKGeocoder:
    """Geocoder for TPHK insurance portfolio data"""

    def __init__(self):
        """Initialize geocoder"""
        self.geocoding_service = GeocodingService(
            cache_file=str(OUTPUT_DIR / 'tphk-geocoding-cache.json')
        )

    def load_policy_data(self, sheet_name: str = None) -> pd.DataFrame:
        """
        Load policy (承保) data from Excel

        Args:
            sheet_name: Specific sheet to load, or None for first sheet

        Returns:
            DataFrame with policy data
        """
        logger.info(f"Loading policy data from: {POLICY_FILE}")

        try:
            # Try to load specific sheet or first sheet
            if sheet_name:
                df = pd.read_excel(POLICY_FILE, sheet_name=sheet_name)
            else:
                # Load first sheet (usually most recent)
                xls = pd.ExcelFile(POLICY_FILE)
                sheet_name = xls.sheet_names[0]
                logger.info(f"Using sheet: {sheet_name}")
                df = pd.read_excel(POLICY_FILE, sheet_name=sheet_name)

            logger.info(f"Loaded {len(df)} policy records")
            return df

        except Exception as e:
            logger.error(f"Failed to load policy data: {e}")
            raise

    def load_claim_data(self) -> pd.DataFrame:
        """
        Load claim (理赔) data from Excel

        Returns:
            DataFrame with claim data
        """
        logger.info(f"Loading claim data from: {CLAIM_FILE}")

        try:
            df = pd.read_excel(CLAIM_FILE)
            logger.info(f"Loaded {len(df)} claim records")
            return df

        except Exception as e:
            logger.error(f"Failed to load claim data: {e}")
            raise

    def extract_unique_addresses(self, policy_df: pd.DataFrame, claim_df: pd.DataFrame = None) -> List[Dict]:
        """
        Extract unique addresses from policy and claim data

        Args:
            policy_df: Policy DataFrame
            claim_df: Optional claim DataFrame

        Returns:
            List of unique addresses with metadata
        """
        addresses = []

        # Extract from policy data (保險處所)
        if '保險處所' in policy_df.columns:
            for idx, row in policy_df.iterrows():
                address = row.get('保險處所')
                if pd.notna(address) and str(address).strip():
                    addresses.append({
                        'address': str(address).strip(),
                        'region': row.get('分區', ''),
                        'source': 'policy',
                        'floor': row.get('樓層數', ''),
                        'building_class': row.get('建築等級', ''),
                        'occupancy': row.get('佔用性質', '')
                    })

        # Extract from claim data (出險地點)
        if claim_df is not None and '出險地點' in claim_df.columns:
            for idx, row in claim_df.iterrows():
                address = row.get('出險地點')
                if pd.notna(address) and str(address).strip():
                    addresses.append({
                        'address': str(address).strip(),
                        'region': row.get('分區', ''),
                        'source': 'claim',
                        'flood_depth': row.get('水浸深度', '')
                    })

        # Remove duplicates based on address
        unique_addresses = {}
        for addr in addresses:
            key = addr['address'].upper()
            if key not in unique_addresses:
                unique_addresses[key] = addr

        logger.info(f"Extracted {len(unique_addresses)} unique addresses")
        return list(unique_addresses.values())

    def geocode_addresses(self, addresses: List[Dict]) -> List[Dict]:
        """
        Geocode all addresses

        Args:
            addresses: List of address dictionaries

        Returns:
            List of geocoded results
        """
        logger.info(f"Starting geocoding of {len(addresses)} addresses")

        results = []
        total = len(addresses)

        for i, addr_info in enumerate(addresses, 1):
            address = addr_info['address']
            region = addr_info.get('region', '')

            logger.info(f"[{i}/{total}] Geocoding: {address[:60]}...")

            # Geocode with region hint
            geocoding = self.geocoding_service.geocode(address, region)

            result = {
                **addr_info,
                'geocoding': geocoding
            }

            results.append(result)

            # Save intermediate results every 50 addresses
            if i % 50 == 0:
                self._save_intermediate(results, f"intermediate_{i}")

        # Print final statistics
        self.geocoding_service.print_stats()

        return results

    def _save_intermediate(self, results: List[Dict], suffix: str):
        """Save intermediate results"""
        try:
            output_file = OUTPUT_DIR / f"tphk-geocoding-{suffix}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            logger.info(f"Intermediate results saved to: {output_file}")
        except Exception as e:
            logger.error(f"Failed to save intermediate results: {e}")

    def create_geojson(self, results: List[Dict]) -> Dict:
        """
        Convert geocoded results to GeoJSON format

        Args:
            results: List of geocoded results

        Returns:
            GeoJSON FeatureCollection
        """
        features = []

        for result in results:
            geocoding = result.get('geocoding')
            if not geocoding:
                continue

            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [geocoding['lng'], geocoding['lat']]
                },
                'properties': {
                    'address': result['address'],
                    'formatted_address': geocoding.get('formatted_address', ''),
                    'region': result.get('region', ''),
                    'source': result.get('source', ''),
                    'provider': geocoding.get('provider', ''),
                    # Additional metadata
                    'floor': result.get('floor', ''),
                    'building_class': result.get('building_class', ''),
                    'occupancy': result.get('occupancy', ''),
                    'flood_depth': result.get('flood_depth', '')
                }
            }
            features.append(feature)

        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'total_addresses': len(results),
                'geocoded': len(features),
                'success_rate': len(features) / len(results) * 100 if results else 0
            }
        }

        logger.info(f"Created GeoJSON with {len(features)} features")
        return geojson

    def save_results(self, results: List[Dict], geojson: Dict):
        """
        Save geocoding results to files

        Args:
            results: Raw geocoding results
            geojson: GeoJSON FeatureCollection
        """
        # Save raw results
        results_file = OUTPUT_DIR / 'tphk-geocoded-portfolio.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Saved raw results to: {results_file}")

        # Save GeoJSON
        geojson_file = OUTPUT_DIR / 'tphk-portfolio.geojson'
        with open(geojson_file, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Saved GeoJSON to: {geojson_file}")

        # Create summary report
        self._create_summary_report(results, geojson)

    def _create_summary_report(self, results: List[Dict], geojson: Dict):
        """Create summary report"""
        total = len(results)
        geocoded = len(geojson['features'])
        failed = total - geocoded

        # Count by provider
        google_count = sum(1 for r in results if r.get('geocoding', {}).get('provider') == 'google')
        amap_count = sum(1 for r in results if r.get('geocoding', {}).get('provider') == 'amap')

        # Count by region
        region_counts = {}
        for r in results:
            region = r.get('region', 'Unknown')
            region_counts[region] = region_counts.get(region, 0) + 1

        report = f"""
# TPHK Portfolio Geocoding Report

## Summary
- **Total Addresses**: {total}
- **Successfully Geocoded**: {geocoded} ({geocoded/total*100:.1f}%)
- **Failed**: {failed} ({failed/total*100:.1f}%)

## Geocoding Providers
- **Google Maps**: {google_count} addresses
- **Amap (高德地图)**: {amap_count} addresses

## Distribution by Region
"""
        for region, count in sorted(region_counts.items(), key=lambda x: x[1], reverse=True):
            report += f"- **{region}**: {count} addresses\n"

        report += f"""

## Output Files
- Raw results: `tphk-geocoded-portfolio.json`
- GeoJSON: `tphk-portfolio.geojson`
- Cache: `tphk-geocoding-cache.json`

## Next Steps
1. Load GeoJSON in frontend application
2. Visualize portfolio on map
3. Integrate with risk assessment modules
4. Link with historical event data
"""

        report_file = OUTPUT_DIR / 'TPHK_GEOCODING_REPORT.md'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        logger.info(f"✓ Saved report to: {report_file}")

    def run_full_geocoding(self, sheet_name: str = None):
        """
        Run complete geocoding pipeline

        Args:
            sheet_name: Optional specific sheet name to process
        """
        logger.info("="*60)
        logger.info("TPHK PORTFOLIO GEOCODING PIPELINE")
        logger.info("="*60)

        # Load data
        policy_df = self.load_policy_data(sheet_name)
        claim_df = self.load_claim_data()

        # Extract unique addresses
        addresses = self.extract_unique_addresses(policy_df, claim_df)

        # Geocode addresses
        results = self.geocode_addresses(addresses)

        # Create GeoJSON
        geojson = self.create_geojson(results)

        # Save results
        self.save_results(results, geojson)

        logger.info("="*60)
        logger.info("GEOCODING COMPLETE!")
        logger.info("="*60)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Geocode TPHK insurance portfolio')
    parser.add_argument('--sheet', type=str, help='Specific sheet name to process')
    parser.add_argument('--test', action='store_true', help='Run test with sample addresses')

    args = parser.parse_args()

    geocoder = TPHKGeocoder()

    if args.test:
        # Test mode: just geocode a few sample addresses
        logger.info("Running in TEST mode")
        test_addresses = [
            {'address': "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.", 'region': '葵青區'},
            {'address': "HOUSE K35 MARINA COVE 380 HIRAM'S HIGHWAY SAI KUNG KOWLOON", 'region': '西貢區'},
        ]
        results = geocoder.geocode_addresses(test_addresses)
        for r in results:
            print(f"\n✓ {r['address']}")
            if r['geocoding']:
                print(f"  Coordinates: {r['geocoding']['lat']}, {r['geocoding']['lng']}")
                print(f"  Provider: {r['geocoding']['provider']}")
            else:
                print("  ✗ Failed to geocode")
    else:
        # Full geocoding
        geocoder.run_full_geocoding(sheet_name=args.sheet)


if __name__ == '__main__':
    main()
