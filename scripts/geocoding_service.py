#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Geocoding Service for Portfolio Management
Supports Google Maps API (primary) and Amap API (fallback)
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GeocodingService:
    """Multi-provider geocoding service with caching and fallback support"""

    def __init__(self,
                 google_api_key: Optional[str] = None,
                 amap_api_key: Optional[str] = None,
                 cache_file: str = 'geocoding_cache.json'):
        """
        Initialize geocoding service

        Args:
            google_api_key: Google Maps API key
            amap_api_key: Amap (高德地图) API key
            cache_file: Path to cache file for storing results
        """
        self.google_api_key = google_api_key or os.getenv('GOOGLE_MAPS_API_KEY')
        self.amap_api_key = amap_api_key or os.getenv('AMAP_API_KEY')
        self.cache_file = cache_file
        self.cache = self._load_cache()

        # API endpoints
        self.google_endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
        self.amap_endpoint = "https://restapi.amap.com/v3/geocode/geo"

        # Rate limiting
        self.google_delay = 0.1  # 10 requests per second (Google free tier allows 50/s)
        self.amap_delay = 0.2    # 5 requests per second (Amap allows 300/min)
        self.last_request_time = 0

        # Statistics
        self.stats = {
            'total': 0,
            'cached': 0,
            'google_success': 0,
            'google_failed': 0,
            'amap_success': 0,
            'amap_failed': 0,
            'no_result': 0
        }

    def _load_cache(self) -> Dict:
        """Load geocoding cache from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache: {e}")
                return {}
        return {}

    def _save_cache(self):
        """Save geocoding cache to file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def _rate_limit(self, delay: float):
        """Apply rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < delay:
            time.sleep(delay - time_since_last)
        self.last_request_time = time.time()

    def geocode_google(self, address: str, region: Optional[str] = None) -> Optional[Dict]:
        """
        Geocode address using Google Maps API

        Args:
            address: Address to geocode
            region: Optional region hint (e.g., "Hong Kong")

        Returns:
            Dictionary with lat, lng, formatted_address, or None
        """
        if not self.google_api_key:
            logger.warning("Google Maps API key not configured")
            return None

        try:
            self._rate_limit(self.google_delay)

            params = {
                'address': address,
                'key': self.google_api_key,
                'language': 'en'  # Get English results
            }

            # Add region hint for Hong Kong addresses
            if region or 'Hong Kong' in address or 'HONG KONG' in address:
                params['region'] = 'hk'

            response = requests.get(self.google_endpoint, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data['status'] == 'OK' and data['results']:
                result = data['results'][0]
                location = result['geometry']['location']

                return {
                    'lat': location['lat'],
                    'lng': location['lng'],
                    'formatted_address': result['formatted_address'],
                    'place_id': result.get('place_id'),
                    'provider': 'google',
                    'timestamp': datetime.now().isoformat()
                }
            elif data['status'] == 'ZERO_RESULTS':
                logger.debug(f"Google: No results for address: {address}")
                return None
            else:
                logger.warning(f"Google API error: {data['status']}")
                return None

        except Exception as e:
            logger.error(f"Google geocoding error: {e}")
            return None

    def geocode_amap(self, address: str, city: Optional[str] = None) -> Optional[Dict]:
        """
        Geocode address using Amap (高德地图) API

        Args:
            address: Address to geocode
            city: Optional city hint (e.g., "香港")

        Returns:
            Dictionary with lat, lng, formatted_address, or None
        """
        if not self.amap_api_key:
            logger.warning("Amap API key not configured")
            return None

        try:
            self._rate_limit(self.amap_delay)

            params = {
                'address': address,
                'key': self.amap_api_key,
                'output': 'json'
            }

            if city:
                params['city'] = city

            response = requests.get(self.amap_endpoint, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data['status'] == '1' and data['geocodes']:
                geocode = data['geocodes'][0]
                location = geocode['location'].split(',')

                # Amap returns [lng, lat], need to swap
                return {
                    'lat': float(location[1]),
                    'lng': float(location[0]),
                    'formatted_address': geocode.get('formatted_address', ''),
                    'adcode': geocode.get('adcode'),
                    'provider': 'amap',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                logger.debug(f"Amap: No results for address: {address}")
                return None

        except Exception as e:
            logger.error(f"Amap geocoding error: {e}")
            return None

    def geocode(self, address: str, region: Optional[str] = None) -> Optional[Dict]:
        """
        Geocode address with automatic fallback

        Tries Google Maps first, falls back to Amap if Google fails

        Args:
            address: Address to geocode
            region: Optional region/district hint

        Returns:
            Dictionary with geocoding result or None
        """
        self.stats['total'] += 1

        # Normalize address for cache key
        cache_key = address.strip().upper()

        # Check cache first
        if cache_key in self.cache:
            self.stats['cached'] += 1
            logger.debug(f"Cache hit: {address}")
            return self.cache[cache_key]

        logger.info(f"Geocoding: {address}")

        # Detect Hong Kong/Macau addresses
        hongkong_keywords = ['香港', '港島', '九龍', '新界', 'HONG KONG', 'HK', '北角', '中環', '尖沙咀', '銅鑼灣', '旺角', '灣仔']
        macau_keywords = ['澳門', 'MACAU', '氹仔', '路環', 'TAIPA', 'COLOANE']

        address_upper = address.upper()
        is_hongkong = any(keyword.upper() in address_upper for keyword in hongkong_keywords)
        is_macau = any(keyword.upper() in address_upper for keyword in macau_keywords)
        is_hkmo = is_hongkong or is_macau

        # For HK/Macau addresses, prioritize Google Maps
        if is_hkmo:
            # Try Google Maps first (best for HK/Macau)
            result = self.geocode_google(address, region or 'Hong Kong')
            if result:
                self.stats['google_success'] += 1
                self.cache[cache_key] = result
                self._save_cache()
                return result
            else:
                self.stats['google_failed'] += 1

            # Fallback to Amap with city parameter for HK/Macau
            logger.info(f"Trying Amap fallback for HK/Macau: {address}")
            city = '香港' if is_hongkong else '澳门'
            result = self.geocode_amap(address, city)
            if result:
                self.stats['amap_success'] += 1
                self.cache[cache_key] = result
                self._save_cache()
                return result
            else:
                self.stats['amap_failed'] += 1
        else:
            # For mainland China addresses, normal priority
            # Try Google Maps first
            result = self.geocode_google(address, region)
            if result:
                self.stats['google_success'] += 1
                self.cache[cache_key] = result
                self._save_cache()
                return result
            else:
                self.stats['google_failed'] += 1

            # Fallback to Amap
            logger.info(f"Trying Amap fallback for: {address}")
            result = self.geocode_amap(address, region)
            if result:
                self.stats['amap_success'] += 1
                self.cache[cache_key] = result
                self._save_cache()
                return result
            else:
                self.stats['amap_failed'] += 1

        # No results from any provider
        self.stats['no_result'] += 1
        logger.warning(f"Failed to geocode: {address}")

        # Cache null result to avoid repeated API calls
        self.cache[cache_key] = None
        self._save_cache()

        return None

    def batch_geocode(self,
                     addresses: List[str],
                     regions: Optional[List[str]] = None,
                     save_interval: int = 10) -> List[Dict]:
        """
        Batch geocode multiple addresses

        Args:
            addresses: List of addresses to geocode
            regions: Optional list of region hints (same length as addresses)
            save_interval: Save cache every N requests

        Returns:
            List of geocoding results
        """
        if regions is None:
            regions = [None] * len(addresses)

        results = []
        total = len(addresses)

        logger.info(f"Starting batch geocoding of {total} addresses")

        for i, (address, region) in enumerate(zip(addresses, regions), 1):
            logger.info(f"Progress: {i}/{total} ({i/total*100:.1f}%)")

            result = self.geocode(address, region)
            results.append({
                'address': address,
                'region': region,
                'geocoding': result
            })

            # Periodic cache save
            if i % save_interval == 0:
                self._save_cache()
                logger.info(f"Cache saved at {i} addresses")

        # Final cache save
        self._save_cache()

        # Print statistics
        self.print_stats()

        return results

    def print_stats(self):
        """Print geocoding statistics"""
        logger.info("=" * 60)
        logger.info("GEOCODING STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Total requests:      {self.stats['total']}")
        logger.info(f"Cache hits:          {self.stats['cached']}")
        logger.info(f"Google success:      {self.stats['google_success']}")
        logger.info(f"Google failed:       {self.stats['google_failed']}")
        logger.info(f"Amap success:        {self.stats['amap_success']}")
        logger.info(f"Amap failed:         {self.stats['amap_failed']}")
        logger.info(f"No results:          {self.stats['no_result']}")

        if self.stats['total'] > 0:
            success_rate = (self.stats['google_success'] + self.stats['amap_success']) / self.stats['total'] * 100
            logger.info(f"Success rate:        {success_rate:.1f}%")

        logger.info("=" * 60)


def example_usage():
    """Example usage of the geocoding service"""

    # Initialize service
    service = GeocodingService()

    # Test Hong Kong addresses
    test_addresses = [
        "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.",
        "HOUSE K35 MARINA COVE 380 HIRAM'S HIGHWAY SAI KUNG KOWLOON",
        "FLAT A 10/F TOWER 1 METRO HARBOUR VIEW 8 FUNG SHUE WO ROAD TSUEN WAN NT"
    ]

    # Single geocoding
    print("Testing single geocoding:")
    result = service.geocode(test_addresses[0])
    if result:
        print(f"✓ {result['formatted_address']}")
        print(f"  Coordinates: {result['lat']}, {result['lng']}")
        print(f"  Provider: {result['provider']}")

    # Batch geocoding
    print("\nTesting batch geocoding:")
    results = service.batch_geocode(test_addresses)

    print(f"\nGeocoded {len(results)} addresses")
    for r in results:
        if r['geocoding']:
            print(f"✓ {r['address'][:50]}...")
        else:
            print(f"✗ {r['address'][:50]}...")


if __name__ == '__main__':
    example_usage()
