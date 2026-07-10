#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Resume Geocoding - Optimized Version (No Space Issue)
优化版：不保存累积的 intermediate 文件，只保存最后的检查点
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
        logging.FileHandler('resume_geocoding_v2.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Failed geocoding logger
failed_logger = logging.getLogger('failed_geocoding')
failed_logger.setLevel(logging.WARNING)
failed_handler = logging.FileHandler('geocoding_failures.log', encoding='utf-8')
failed_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
failed_logger.addHandler(failed_handler)

# Paths
OUTPUT_DIR = Path(__file__).parent.parent / 'output'
DATA_FILE = Path(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-承保信息 (香港地區).xlsx")

# Find the latest checkpoint
def find_latest_checkpoint():
    # Support both naming patterns: intermediate and checkpoint
    checkpoints = list(OUTPUT_DIR.glob('tphk-geocoding-intermediate_*.json'))
    checkpoints += list(OUTPUT_DIR.glob('tphk-geocoding-checkpoint_*.json'))

    if not checkpoints:
        return None, 0

    latest = max(checkpoints, key=lambda p: int(p.stem.split('_')[-1]))
    count = int(latest.stem.split('_')[-1])
    return latest, count

def main():
    logger.info("=" * 80)
    logger.info("Resume Geocoding - Optimized Version")
    logger.info("=" * 80)

    # Find latest checkpoint
    checkpoint_file, completed_count = find_latest_checkpoint()

    if not checkpoint_file:
        logger.error("No checkpoint found!")
        return 1

    logger.info(f"Loading checkpoint: {checkpoint_file}")
    with open(checkpoint_file, 'r', encoding='utf-8') as f:
        completed_data = json.load(f)

    logger.info(f"✓ Loaded {completed_count:,} completed records")

    # Load Excel
    logger.info(f"Loading original Excel: {DATA_FILE}")
    xls = pd.ExcelFile(DATA_FILE)
    df_all = pd.read_excel(DATA_FILE, sheet_name=xls.sheet_names[0])
    total_count = len(df_all)

    logger.info(f"✓ Total records: {total_count:,}")
    logger.info(f"✓ Remaining: {total_count - completed_count:,}")

    if completed_count >= total_count:
        logger.info("✅ All records processed!")
        # Save final
        final_json = OUTPUT_DIR / 'tphk-geocoded-full.json'
        with open(final_json, 'w', encoding='utf-8') as f:
            json.dump(completed_data, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Saved: {final_json}")
        return 0

    # Import geocoding
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from geocoding_service import GeocodingService

    geocoding_service = GeocodingService(
        cache_file=str(OUTPUT_DIR / 'tphk-geocoding-cache.json')
    )

    logger.info("")
    logger.info("=" * 80)
    logger.info(f"Processing remaining {total_count - completed_count:,} records...")
    logger.info("=" * 80)

    remaining_data = []
    start_time = datetime.now()

    stats = {
        'geocoding_success': 0,
        'geocoding_failed': 0
    }

    for idx in range(completed_count, total_count):
        row = df_all.iloc[idx]

        record = {}
        for col in df_all.columns:
            value = row.get(col)
            if pd.isna(value):
                record[col] = None
            elif isinstance(value, (int, float)):
                record[col] = float(value) if not pd.isna(value) else None
            else:
                record[col] = str(value)

        record['policy_id'] = record.get('保單號')
        record['address'] = record.get('保險處所')
        record['region'] = record.get('分區') or ''
        record['sum_insured'] = record.get('公司保額')
        record['occupancy'] = record.get('佔用性質')
        record['construction_class'] = record.get('建築等級')
        record['floors'] = record.get('樓層數')
        record['year_built'] = record.get('建造年份')
        record['event_code'] = record.get('巨災代碼')
        record['event_name'] = record.get('巨災名稱')

        address = record.get('address')
        if address and str(address).strip():
            progress = (idx + 1 - completed_count) / (total_count - completed_count) * 100
            logger.info(f"[{idx+1}/{total_count}] ({progress:.1f}%) Geocoding: {str(address)[:60]}...")

            geocoding = geocoding_service.geocode(str(address), record.get('region'))

            if geocoding:
                record['location'] = geocoding
                stats['geocoding_success'] += 1
            else:
                stats['geocoding_failed'] += 1
                failed_logger.warning(
                    f"FAILED | Record {idx+1} | Policy: {record.get('policy_id')} | "
                    f"Address: {str(address)[:100]}"
                )

        remaining_data.append(record)

        # 每1000条保存一次检查点（不是累积，只保存最新的）
        if (idx + 1) % 1000 == 0:
            # 删除旧的检查点（两种命名模式都要删）
            for old_checkpoint in OUTPUT_DIR.glob('tphk-geocoding-intermediate_*.json'):
                old_checkpoint.unlink()
            for old_checkpoint in OUTPUT_DIR.glob('tphk-geocoding-checkpoint_*.json'):
                old_checkpoint.unlink()

            # 保存新检查点（只保存当前进度的数据）
            checkpoint_file = OUTPUT_DIR / f'tphk-geocoding-checkpoint_{idx+1}.json'
            all_data = completed_data + remaining_data

            with open(checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)

            logger.info(f"  → Checkpoint saved: {idx+1}")
            logger.info(f"  Progress: Success={stats['geocoding_success']}, Failed={stats['geocoding_failed']}")

    # Save final
    all_data = completed_data + remaining_data
    final_json = OUTPUT_DIR / 'tphk-geocoded-full.json'

    logger.info("Saving final file...")
    with open(final_json, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ Saved: {final_json}")
    logger.info("✅ Completed!")

    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        logger.warning("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
