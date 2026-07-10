#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TPHK Portfolio Geocoding Script (Subset 5000)
Processes a subset of Taiping Hong Kong insurance data for testing.
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

try:
    from geocoding_service import GeocodingService
except ImportError:
    # Fallback if running from root
    sys.path.append(str(script_dir / 'scripts'))
    from geocoding_service import GeocodingService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tphk-geocoding-subset.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# File paths
DATA_DIR = Path(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK")
# Try to find the file if the exact name changes
files = list(DATA_DIR.glob("*承保信息*.xlsx"))
if files:
    POLICY_FILE = files[0]
else:
    POLICY_FILE = DATA_DIR / "2412 巨災統計-承保信息 (香港地區).xlsx"

OUTPUT_DIR = Path(r"D:\Nat Cat Platform\UI_system\public\data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "tphk_portfolio_subset_5000.json"

class TPHKGeocoderSubset:
    def __init__(self):
        self.geocoding_service = GeocodingService(
            cache_file=str(OUTPUT_DIR / 'tphk-geocoding-cache.json')
        )

    def load_and_process(self, limit=5000):
        logger.info(f"Loading policy data from: {POLICY_FILE}")
        
        if not POLICY_FILE.exists():
            logger.error(f"File not found: {POLICY_FILE}")
            return

        try:
            # Load data
            df = pd.read_excel(POLICY_FILE)
            logger.info(f"Loaded {len(df)} total records")
            
            # Extract addresses
            addresses = []
            if '保險處所' in df.columns:
                for idx, row in df.iterrows():
                    if idx >= limit:
                        break
                        
                    address = row.get('保險處所')
                    if pd.notna(address) and str(address).strip():
                        addresses.append({
                            'id': str(row.get('保單號', f'P{idx}')),
                            'address': str(address).strip(),
                            'region': row.get('分區', ''),
                            'sum_insured': row.get('總保額', 0),
                            'occupancy': row.get('佔用性質', ''),
                            'construction': row.get('建築等級', ''),
                            'year_built': row.get('建造年份', '')
                        })
            
            logger.info(f"Extracted {len(addresses)} addresses (limit: {limit})")
            
            # Geocode
            results = self.geocode_addresses(addresses)
            
            # Save
            self.save_results(results)
            
        except Exception as e:
            logger.error(f"Error processing data: {e}")
            raise

    def geocode_addresses(self, addresses: List[Dict]) -> List[Dict]:
        logger.info(f"Starting geocoding of {len(addresses)} addresses")
        results = []
        
        for i, addr_info in enumerate(addresses, 1):
            address = addr_info['address']
            region = addr_info.get('region', '')
            
            if i % 100 == 0:
                logger.info(f"[{i}/{len(addresses)}] Processing...")
                
            # Geocode
            geocoding = self.geocoding_service.geocode(address, region)
            
            result = {
                **addr_info,
                'location': geocoding if geocoding else None
            }
            results.append(result)
            
        return results

    def save_results(self, results: List[Dict]):
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(results)} records to {OUTPUT_FILE}")

if __name__ == "__main__":
    geocoder = TPHKGeocoderSubset()
    geocoder.load_and_process(limit=5000)
