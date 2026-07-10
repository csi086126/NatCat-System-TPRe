#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TPHK Claims Data Geocoding Script
处理香港理赔数据的地理编码
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('geocode_claims.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Failed geocoding logger
failed_logger = logging.getLogger('failed_geocoding')
failed_logger.setLevel(logging.WARNING)
failed_handler = logging.FileHandler('claims_geocoding_failures.log', encoding='utf-8')
failed_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
failed_logger.addHandler(failed_handler)

# Paths
OUTPUT_DIR = Path(__file__).parent.parent / 'output'
DATA_FILE = Path(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-理赔信息 (香港地區).xlsx")
CACHE_FILE = OUTPUT_DIR / 'tphk-geocoding-cache.json'  # 复用承保数据的缓存

def main():
    logger.info("=" * 80)
    logger.info("TPHK Claims Data Geocoding")
    logger.info("=" * 80)

    # Import geocoding service
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from geocoding_service import GeocodingService

    # Initialize geocoding service with existing cache
    geocoding_service = GeocodingService(
        cache_file=str(CACHE_FILE)
    )

    # Load Excel data
    logger.info(f"Loading claims data: {DATA_FILE}")
    df = pd.read_excel(DATA_FILE)
    total_count = len(df)
    logger.info(f"✓ Total records: {total_count:,}")

    # Show column names
    logger.info(f"\nColumns in claims data:")
    for i, col in enumerate(df.columns, 1):
        logger.info(f"  {i}. {col}")

    # Process each record
    logger.info("")
    logger.info("=" * 80)
    logger.info(f"Starting geocoding of {total_count:,} claims records...")
    logger.info("=" * 80)

    results = []
    start_time = datetime.now()
    address_field_used = None  # 记录使用的地址字段

    stats = {
        'geocoding_success': 0,
        'geocoding_failed': 0
    }

    for idx, row in df.iterrows():
        # Build complete record (keep all original fields)
        record = {}
        for col in df.columns:
            value = row.get(col)
            # Convert to native Python types
            if pd.isna(value):
                record[col] = None
            elif isinstance(value, (pd.Timestamp, datetime)):
                record[col] = value.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(value, (int, float)):
                record[col] = float(value) if pd.notna(value) else None
            else:
                record[col] = str(value) if pd.notna(value) else None

        # Get address field (简繁体都支持)
        address = None
        address_fields = ['出险地址', '出險地址', '保险处所', '保險處所', '理赔地址', '理賠地址', '地址', '出险地点', '出險地點']

        for field in address_fields:
            if field in record and record[field]:
                address = record[field]
                # 只在第一次显示使用的字段
                if address_field_used is None:
                    address_field_used = field
                    logger.info(f"✓ Using address field: '{field}'")
                    logger.info("")
                break

        if not address:
            logger.warning(f"[{idx+1}/{total_count}] No address field found")
            record['location'] = None
            results.append(record)
            stats['geocoding_failed'] += 1
            continue

        # Progress log
        progress = (idx + 1) / total_count * 100
        logger.info(f"[{idx+1}/{total_count}] ({progress:.1f}%) Geocoding: {address[:80]}...")

        # Geocode
        location = geocoding_service.geocode(address)

        if location:
            record['location'] = location
            stats['geocoding_success'] += 1
        else:
            record['location'] = None
            stats['geocoding_failed'] += 1

            # Log failure
            policy_id = record.get('保单号', record.get('理赔号', 'N/A'))
            failed_logger.warning(
                f"FAILED | Record {idx} | Policy/Claim: {policy_id} | Address: {address[:100]}"
            )

        results.append(record)

        # Save checkpoint every 50 records (理赔数据量小，更频繁保存)
        if (idx + 1) % 50 == 0 or (idx + 1) == total_count:
            checkpoint_file = OUTPUT_DIR / f'tphk-claims-checkpoint_{idx+1}.json'

            # Delete old checkpoints
            for old_checkpoint in OUTPUT_DIR.glob('tphk-claims-checkpoint_*.json'):
                old_checkpoint.unlink()

            with open(checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            logger.info(f"  → Checkpoint saved: {idx+1}")
            logger.info(f"  Progress: Success={stats['geocoding_success']}, Failed={stats['geocoding_failed']}")

    # Save final file
    final_json = OUTPUT_DIR / 'tphk-claims-geocoded.json'

    logger.info("\nSaving final file...")
    with open(final_json, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ Saved: {final_json}")

    # Clean up checkpoint files
    for checkpoint in OUTPUT_DIR.glob('tphk-claims-checkpoint_*.json'):
        checkpoint.unlink()

    # Print summary
    elapsed = datetime.now() - start_time
    logger.info("")
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total records:        {total_count:,}")
    logger.info(f"Successfully geocoded: {stats['geocoding_success']:,} ({stats['geocoding_success']/total_count*100:.1f}%)")
    logger.info(f"Failed geocoding:      {stats['geocoding_failed']:,} ({stats['geocoding_failed']/total_count*100:.1f}%)")
    logger.info(f"Time elapsed:          {elapsed}")
    logger.info(f"Output file:           {final_json}")
    logger.info("✅ Completed!")

    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        logger.warning("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)
