#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TPMO (Macau) Portfolio Geocoding Script
Processes Taiping Macau insurance data and geocodes addresses
Outputs GeoJSON files split by policy start year

Based on: geocode-tphk-portfolio.py
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
import logging
from datetime import datetime
from dotenv import load_dotenv
import time
import requests

# Add scripts directory to path
script_dir = Path(__file__).parent
ui_system_dir = script_dir.parent
sys.path.append(str(script_dir))

# Load environment variables from .env.local FIRST (before any imports that use them)
env_file = ui_system_dir / '.env.local'
if env_file.exists():
    load_dotenv(env_file, override=True)
    print(f"Loaded environment from: {env_file}")
else:
    load_dotenv()  # Try default .env
    print("Using default .env file")

# Verify API keys are loaded
print(f"AMAP_API_KEY: {'configured' if os.getenv('AMAP_API_KEY') else 'NOT FOUND'}")
print(f"GOOGLE_MAPS_API_KEY: {'configured' if os.getenv('GOOGLE_MAPS_API_KEY') else 'NOT FOUND'}")

# Now import GeocodingService (after env vars are loaded)
try:
    from geocoding_service import GeocodingService
    print("Using GeocodingService from geocoding_service.py")
except ImportError:
    print("Warning: Could not import GeocodingService, will use built-in implementation")
    GeocodingService = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tpmo-geocoding.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# File paths
DATA_DIR = Path(os.getenv("TPMO_DATA_DIR", r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPMOr"))
POLICY_FILE = DATA_DIR / "承保信息.xlsx"
OUTPUT_DIR = Path(os.getenv("PUBLIC_DATA_DIR", r"D:\Nat Cat Platform\UI_system\public\data") + r"\macau")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Column names for Macau data
ADDRESS_COL = "标的位置"
DATE_COL = "保单起期"
POLICY_NO_COL = "policyno"
INSURED_COL = "被保险人"
INSURANCE_TYPE_COL = "险种"
STRUCTURE_COL = "建筑结构"
OCCUPATION_COL = "占用性质_occupation"
OCCUPATION_DESC_COL = "占用性质_occupationdesc"
SUM_INSURED_COL = "保额（100%）"
COMPANY_SUM_COL = "公司保额"


class SimpleGeocodingService:
    """Simple geocoding service using Amap API (for Macau addresses)"""
    
    def __init__(self, cache_file: str = 'geocoding_cache.json'):
        self.amap_api_key = os.getenv('AMAP_API_KEY', '')
        self.google_api_key = os.getenv('GOOGLE_MAPS_API_KEY', '')
        self.cache_file = cache_file
        self.cache = self._load_cache()
        self.last_request_time = 0
        self.request_delay = 0.2  # 200ms between requests
        
        # Debug: Print API key status
        logger.info(f"Amap API Key: {'configured (' + self.amap_api_key[:8] + '...)' if self.amap_api_key else 'NOT CONFIGURED'}")
        logger.info(f"Google API Key: {'configured (' + self.google_api_key[:8] + '...)' if self.google_api_key else 'NOT CONFIGURED'}")
        
        # Statistics
        self.stats = {
            'total': 0,
            'cached': 0,
            'amap_success': 0,
            'amap_failed': 0,
            'google_success': 0,
            'google_failed': 0,
            'no_result': 0
        }
    
    def _load_cache(self) -> Dict:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def _save_cache(self):
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
    
    def _rate_limit(self):
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)
        self.last_request_time = time.time()
    
    def geocode_amap(self, address: str) -> Optional[Dict]:
        """Geocode using Amap (高德地图) - best for Macau/China addresses"""
        if not self.amap_api_key:
            logger.warning("Amap API key not configured")
            return None
        
        try:
            self._rate_limit()
            
            # Add "澳门" prefix if not present for better accuracy
            search_address = address
            if not any(x in address for x in ['澳門', '澳门', 'Macau', 'Macao']):
                search_address = f"澳門 {address}"
            
            url = "https://restapi.amap.com/v3/geocode/geo"
            params = {
                'key': self.amap_api_key,
                'address': search_address,
                'city': '澳门'  # Hint for Macau
            }
            
            logger.debug(f"Amap request: {search_address}")
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            logger.debug(f"Amap response: {data}")
            
            if data.get('status') == '1' and data.get('geocodes'):
                result = data['geocodes'][0]
                location = result.get('location', '').split(',')
                if len(location) == 2:
                    logger.info(f"  ✓ Amap success: {address[:30]}... -> {location}")
                    return {
                        'lat': float(location[1]),
                        'lng': float(location[0]),
                        'formatted_address': result.get('formatted_address', ''),
                        'provider': 'amap',
                        'timestamp': datetime.now().isoformat()
                    }
            else:
                # Log the error response
                logger.warning(f"Amap geocoding failed for '{address[:30]}...': status={data.get('status')}, info={data.get('info')}")
            return None
        except Exception as e:
            logger.error(f"Amap geocoding error for '{address[:30]}...': {e}")
            return None
    
    def geocode_google(self, address: str) -> Optional[Dict]:
        """Geocode using Google Maps API - fallback"""
        if not self.google_api_key:
            return None
        
        try:
            self._rate_limit()
            
            # Add Macau hint
            search_address = address
            if not any(x in address for x in ['澳門', '澳门', 'Macau', 'Macao']):
                search_address = f"{address}, Macau"
            
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                'address': search_address,
                'key': self.google_api_key,
                'region': 'mo'  # Macau region hint
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('status') == 'OK' and data.get('results'):
                result = data['results'][0]
                location = result['geometry']['location']
                return {
                    'lat': location['lat'],
                    'lng': location['lng'],
                    'formatted_address': result['formatted_address'],
                    'provider': 'google',
                    'timestamp': datetime.now().isoformat()
                }
            return None
        except Exception as e:
            logger.debug(f"Google geocoding error: {e}")
            return None
    
    def geocode(self, address: str, region: str = '') -> Optional[Dict]:
        """Main geocoding method with cache and fallback"""
        self.stats['total'] += 1
        
        # Check cache first
        cache_key = address.upper().strip()
        if cache_key in self.cache:
            self.stats['cached'] += 1
            return self.cache[cache_key]
        
        # Try Amap first (better for Chinese addresses)
        result = self.geocode_amap(address)
        if result:
            self.stats['amap_success'] += 1
            self.cache[cache_key] = result
            return result
        else:
            self.stats['amap_failed'] += 1
        
        # Fallback to Google
        result = self.geocode_google(address)
        if result:
            self.stats['google_success'] += 1
            self.cache[cache_key] = result
            return result
        else:
            self.stats['google_failed'] += 1
        
        self.stats['no_result'] += 1
        return None
    
    def print_stats(self):
        """Print geocoding statistics"""
        print("\n" + "="*50)
        print("Geocoding Statistics")
        print("="*50)
        for key, value in self.stats.items():
            print(f"  {key}: {value}")
        if self.stats['total'] > 0:
            success = self.stats['amap_success'] + self.stats['google_success'] + self.stats['cached']
            rate = success / self.stats['total'] * 100
            print(f"  Success Rate: {rate:.1f}%")
        print("="*50)


class TPMOGeocoder:
    """Geocoder for TPMO (Macau) insurance portfolio data"""

    def __init__(self):
        """Initialize geocoder"""
        cache_file = str(OUTPUT_DIR / 'tpmo-geocoding-cache.json')
        
        # Try to use the full GeocodingService, fallback to simple version
        if GeocodingService:
            self.geocoding_service = GeocodingService(cache_file=cache_file)
        else:
            self.geocoding_service = SimpleGeocodingService(cache_file=cache_file)

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
            if sheet_name:
                df = pd.read_excel(POLICY_FILE, sheet_name=sheet_name)
            else:
                xls = pd.ExcelFile(POLICY_FILE)
                sheet_name = xls.sheet_names[0]
                logger.info(f"Using sheet: {sheet_name}")
                df = pd.read_excel(POLICY_FILE, sheet_name=sheet_name)

            logger.info(f"Loaded {len(df)} policy records")
            
            # Parse date column
            if DATE_COL in df.columns:
                df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors='coerce')
                df['policy_year'] = df[DATE_COL].dt.year
            
            return df

        except Exception as e:
            logger.error(f"Failed to load policy data: {e}")
            raise

    def extract_unique_addresses(self, df: pd.DataFrame) -> Dict[str, List[Dict]]:
        """
        Extract unique addresses grouped by year

        Args:
            df: Policy DataFrame

        Returns:
            Dictionary with year as key and list of address info as value
        """
        addresses_by_year = {}

        if ADDRESS_COL not in df.columns:
            logger.error(f"Address column '{ADDRESS_COL}' not found!")
            return addresses_by_year

        for idx, row in df.iterrows():
            address = row.get(ADDRESS_COL)
            year = row.get('policy_year')
            
            if pd.isna(address) or not str(address).strip():
                continue
            if pd.isna(year):
                year = 'unknown'
            else:
                year = int(year)
            
            if year not in addresses_by_year:
                addresses_by_year[year] = {}
            
            addr_key = str(address).strip().upper()
            
            # Store with all metadata (keep first occurrence)
            if addr_key not in addresses_by_year[year]:
                addresses_by_year[year][addr_key] = {
                    'address': str(address).strip(),
                    'policy_no': str(row.get(POLICY_NO_COL, '')),
                    'insured': str(row.get(INSURED_COL, '')),
                    'insurance_type': str(row.get(INSURANCE_TYPE_COL, '')),
                    'structure': str(row.get(STRUCTURE_COL, '')),
                    'occupation': str(row.get(OCCUPATION_COL, '')),
                    'occupation_desc': str(row.get(OCCUPATION_DESC_COL, '')),
                    'sum_insured': row.get(SUM_INSURED_COL, 0),
                    'company_sum': row.get(COMPANY_SUM_COL, 0),
                    'policy_date': str(row.get(DATE_COL, '')),
                    'year': year
                }
            else:
                # Accumulate sum insured for same address
                addresses_by_year[year][addr_key]['sum_insured'] = (
                    addresses_by_year[year][addr_key].get('sum_insured', 0) + 
                    (row.get(SUM_INSURED_COL, 0) or 0)
                )
                addresses_by_year[year][addr_key]['company_sum'] = (
                    addresses_by_year[year][addr_key].get('company_sum', 0) + 
                    (row.get(COMPANY_SUM_COL, 0) or 0)
                )

        # Log summary
        total = sum(len(addrs) for addrs in addresses_by_year.values())
        logger.info(f"Extracted {total} unique addresses across {len(addresses_by_year)} years")
        for year in sorted(addresses_by_year.keys()):
            logger.info(f"  {year}: {len(addresses_by_year[year])} unique addresses")

        return addresses_by_year

    def geocode_addresses(self, addresses: Dict[str, Dict]) -> List[Dict]:
        """
        Geocode all addresses for a given year

        Args:
            addresses: Dictionary of address info

        Returns:
            List of geocoded results
        """
        results = []
        total = len(addresses)
        
        for i, (addr_key, addr_info) in enumerate(addresses.items(), 1):
            address = addr_info['address']
            
            if i % 100 == 0 or i == 1:
                logger.info(f"[{i}/{total}] Geocoding: {address[:50]}...")
            
            geocoding = self.geocoding_service.geocode(address)
            
            result = {
                **addr_info,
                'geocoding': geocoding
            }
            results.append(result)
            
            # Save cache periodically
            if i % 500 == 0:
                self.geocoding_service._save_cache()
        
        # Final cache save
        self.geocoding_service._save_cache()
        
        return results

    def create_geojson(self, results: List[Dict], year: int) -> Dict:
        """
        Convert geocoded results to GeoJSON format

        Args:
            results: List of geocoded results
            year: Policy year

        Returns:
            GeoJSON FeatureCollection
        """
        features = []

        for result in results:
            geocoding = result.get('geocoding')
            if not geocoding:
                continue

            # Convert sum insured to float for JSON
            sum_insured = result.get('sum_insured', 0)
            company_sum = result.get('company_sum', 0)
            if pd.isna(sum_insured):
                sum_insured = 0
            if pd.isna(company_sum):
                company_sum = 0

            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [geocoding['lng'], geocoding['lat']]
                },
                'properties': {
                    'address': result['address'],
                    'formatted_address': geocoding.get('formatted_address', ''),
                    'policy_no': result.get('policy_no', ''),
                    'insured': result.get('insured', ''),
                    'insurance_type': result.get('insurance_type', ''),
                    'structure': result.get('structure', ''),
                    'occupation': result.get('occupation', ''),
                    'occupation_desc': result.get('occupation_desc', ''),
                    'sum_insured': float(sum_insured),
                    'company_sum': float(company_sum),
                    'policy_date': result.get('policy_date', ''),
                    'year': year,
                    'provider': geocoding.get('provider', ''),
                    'region': 'Macau'
                }
            }
            features.append(feature)

        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'year': year,
                'total_addresses': len(results),
                'geocoded': len(features),
                'success_rate': len(features) / len(results) * 100 if results else 0,
                'generated_at': datetime.now().isoformat()
            }
        }

        return geojson

    def save_year_geojson(self, geojson: Dict, year: int):
        """Save GeoJSON for a specific year"""
        filename = f"tpmo-portfolio-{year}.geojson"
        filepath = OUTPUT_DIR / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✓ Saved: {filepath} ({len(geojson['features'])} features)")
        return filepath

    def create_summary_index(self, all_years: Dict[int, Dict]):
        """Create an index file listing all year files"""
        index = {
            'region': 'Macau',
            'source': 'TPMO',
            'generated_at': datetime.now().isoformat(),
            'years': []
        }
        
        for year in sorted(all_years.keys()):
            meta = all_years[year]
            index['years'].append({
                'year': year,
                'file': f"tpmo-portfolio-{year}.geojson",
                'total_addresses': meta.get('total_addresses', 0),
                'geocoded': meta.get('geocoded', 0),
                'success_rate': meta.get('success_rate', 0)
            })
        
        index_file = OUTPUT_DIR / 'tpmo-portfolio-index.json'
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✓ Saved index: {index_file}")

    def run_full_geocoding(self, years_filter: List[int] = None):
        """
        Run complete geocoding pipeline

        Args:
            years_filter: Optional list of years to process (None = all years)
        """
        logger.info("="*60)
        logger.info("TPMO (MACAU) PORTFOLIO GEOCODING PIPELINE")
        logger.info("="*60)

        # Load data
        df = self.load_policy_data()

        # Extract unique addresses by year
        addresses_by_year = self.extract_unique_addresses(df)

        # Filter years if specified
        if years_filter:
            addresses_by_year = {
                y: addrs for y, addrs in addresses_by_year.items() 
                if y in years_filter
            }
            logger.info(f"Filtered to years: {years_filter}")

        # Process each year
        all_years_metadata = {}
        
        for year in sorted(addresses_by_year.keys()):
            if year == 'unknown':
                continue
                
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing year: {year}")
            logger.info(f"{'='*60}")
            
            addresses = addresses_by_year[year]
            
            # Geocode
            results = self.geocode_addresses(addresses)
            
            # Create GeoJSON
            geojson = self.create_geojson(results, year)
            
            # Save
            self.save_year_geojson(geojson, year)
            
            # Store metadata
            all_years_metadata[year] = geojson['metadata']

        # Create index file
        self.create_summary_index(all_years_metadata)

        # Print final stats
        self.geocoding_service.print_stats()

        logger.info("\n" + "="*60)
        logger.info("GEOCODING COMPLETE!")
        logger.info(f"Output directory: {OUTPUT_DIR}")
        logger.info("="*60)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Geocode TPMO (Macau) insurance portfolio')
    parser.add_argument('--years', type=str, help='Comma-separated list of years to process (e.g., "2023,2024,2025")')
    parser.add_argument('--test', action='store_true', help='Run test with sample addresses')

    args = parser.parse_args()

    geocoder = TPMOGeocoder()

    if args.test:
        # Test mode: just geocode a few sample addresses
        logger.info("Running in TEST mode")
        test_addresses = {
            'test1': {'address': "澳門板樟堂前地", 'year': 2024},
            'test2': {'address': "澳門國際機場", 'year': 2024},
            'test3': {'address': "路環計單奴街", 'year': 2024},
            'test4': {'address': "澳門氹仔海洋花園", 'year': 2024},
        }
        results = geocoder.geocode_addresses(test_addresses)
        for r in results:
            print(f"\n✓ {r['address']}")
            if r['geocoding']:
                print(f"  Coordinates: {r['geocoding']['lat']}, {r['geocoding']['lng']}")
                print(f"  Provider: {r['geocoding']['provider']}")
            else:
                print("  ✗ Failed to geocode")
    else:
        # Parse years filter
        years_filter = None
        if args.years:
            years_filter = [int(y.strip()) for y in args.years.split(',')]
        
        # Full geocoding
        geocoder.run_full_geocoding(years_filter=years_filter)


if __name__ == '__main__':
    main()
