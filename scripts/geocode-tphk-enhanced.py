#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced TPHK Geocoding with District Extraction
自动从地址提取并补充香港分区信息
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
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
        logging.FileHandler('tphk-geocoding-enhanced.log', encoding='utf-8'),
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

# 香港18区中英文对照
HK_DISTRICTS_MAPPING = {
    'Central and Western': '中西區',
    'Eastern': '東區',
    'Southern': '南區',
    'Wan Chai': '灣仔區',
    'Kowloon City': '九龍城區',
    'Kwun Tong': '觀塘區',
    'Sham Shui Po': '深水埗區',
    'Wong Tai Sin': '黃大仙區',
    'Yau Tsim Mong': '油尖旺區',
    'Islands': '離島區',
    'Kwai Tsing': '葵青區',
    'North': '北區',
    'Sai Kung': '西貢區',
    'Sha Tin': '沙田區',
    'Tai Po': '大埔區',
    'Tsuen Wan': '荃灣區',
    'Tuen Mun': '屯門區',
    'Yuen Long': '元朗區'
}

# 香港分区关键词（用于从地址文本提取）
DISTRICT_KEYWORDS = {
    '中西區': ['中环', 'Central', '西环', 'Western', '上环', 'Sheung Wan', '西营盘', 'Sai Ying Pun'],
    '東區': ['筲箕湾', 'Shau Kei Wan', '西湾河', 'Sai Wan Ho', '太古', 'Taikoo', '北角', 'North Point', '鰂鱼涌', 'Quarry Bay'],
    '南區': ['香港仔', 'Aberdeen', '赤柱', 'Stanley', '薄扶林', 'Pok Fu Lam', '鸭脷洲', 'Ap Lei Chau'],
    '灣仔區': ['湾仔', 'Wan Chai', '铜锣湾', 'Causeway Bay', '跑马地', 'Happy Valley', '大坑', 'Tai Hang'],
    '九龍城區': ['九龙城', 'Kowloon City', '红磡', 'Hung Hom', '土瓜湾', 'To Kwa Wan', '何文田', 'Ho Man Tin'],
    '觀塘區': ['观塘', 'Kwun Tong', '牛头角', 'Ngau Tau Kok', '蓝田', 'Lam Tin', '九龙湾', 'Kowloon Bay'],
    '深水埗區': ['深水埗', 'Sham Shui Po', '长沙湾', 'Cheung Sha Wan', '荔枝角', 'Lai Chi Kok'],
    '黃大仙區': ['黄大仙', 'Wong Tai Sin', '钻石山', 'Diamond Hill', '慈云山', 'Tsz Wan Shan'],
    '油尖旺區': ['尖沙咀', 'Tsim Sha Tsui', '油麻地', 'Yau Ma Tei', '旺角', 'Mong Kok', '佐敦', 'Jordan'],
    '離島區': ['大屿山', 'Lantau', '长洲', 'Cheung Chau', '南丫岛', 'Lamma', '坪洲', 'Peng Chau', '东涌', 'Tung Chung'],
    '葵青區': ['葵涌', 'Kwai Chung', '青衣', 'Tsing Yi', '葵芳', 'Kwai Fong'],
    '北區': ['上水', 'Sheung Shui', '粉岭', 'Fanling', '沙头角', 'Sha Tau Kok'],
    '西貢區': ['西贡', 'Sai Kung', '将军澳', 'Tseung Kwan O', '调景岭', 'Tiu Keng Leng'],
    '沙田區': ['沙田', 'Sha Tin', '火炭', 'Fo Tan', '马鞍山', 'Ma On Shan', '大围', 'Tai Wai'],
    '大埔區': ['大埔', 'Tai Po'],
    '荃灣區': ['荃湾', 'Tsuen Wan', '马湾', 'Ma Wan'],
    '屯門區': ['屯门', 'Tuen Mun'],
    '元朗區': ['元朗', 'Yuen Long', '天水围', 'Tin Shui Wai']
}


def extract_district_from_address(address: str) -> Optional[str]:
    """
    从地址文本中提取香港分区（基于关键词匹配）
    """
    if not address:
        return None

    address_upper = str(address).upper()

    for district, keywords in DISTRICT_KEYWORDS.items():
        for keyword in keywords:
            if keyword.upper() in address_upper:
                return district

    return None


def extract_district_from_google_result(geocoding_result: Dict) -> Optional[str]:
    """
    从Google Maps API返回结果中提取香港分区
    """
    if not geocoding_result:
        return None

    # 如果结果中已经有district字段，直接返回
    if 'district' in geocoding_result:
        return geocoding_result['district']

    # 从formatted_address尝试提取
    formatted_addr = geocoding_result.get('formatted_address', '')
    district_from_text = extract_district_from_address(formatted_addr)
    if district_from_text:
        return district_from_text

    return None


class TPHKEnhancedGeocoder:
    """Enhanced geocoder with district extraction"""

    def __init__(self):
        """Initialize geocoder"""
        self.geocoding_service = GeocodingService(
            cache_file=str(OUTPUT_DIR / 'tphk-geocoding-cache.json')
        )
        self.stats = {
            'total_records': 0,
            'has_original_district': 0,
            'district_from_geocoding': 0,
            'district_from_text': 0,
            'no_district': 0
        }

    def load_and_geocode_data(self, max_records: Optional[int] = None) -> pd.DataFrame:
        """
        Load Excel data and perform geocoding with district extraction

        Args:
            max_records: Maximum number of records to process (None = all)

        Returns:
            DataFrame with geocoded data and district information
        """
        logger.info("="*60)
        logger.info("开始加载和处理TPHK数据")
        logger.info("="*60)

        # Read policy data
        logger.info(f"读取承保数据: {POLICY_FILE}")
        xls = pd.ExcelFile(POLICY_FILE)
        df_policy = pd.read_excel(POLICY_FILE, sheet_name=xls.sheet_names[0])

        if max_records:
            df_policy = df_policy.head(max_records)
            logger.info(f"限制处理前 {max_records} 条记录")

        logger.info(f"共 {len(df_policy)} 条记录")

        # Process each record
        results = []

        for idx, row in df_policy.iterrows():
            self.stats['total_records'] += 1

            # 保留所有原始字段
            record = {}

            # 遍历所有列，保留所有字段
            for col in df_policy.columns:
                value = row.get(col)

                # 处理不同类型的值
                if pd.isna(value):
                    record[col] = None
                elif isinstance(value, (int, float)):
                    record[col] = float(value) if not pd.isna(value) else None
                else:
                    record[col] = str(value)

            # 添加标准化字段名（英文，便于前端使用）
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
            record['business_type'] = record.get('業務類別')
            record['policy_start'] = record.get('保單起期')
            record['policy_end'] = record.get('保單止期')
            record['coverage_name'] = record.get('險種名稱')
            record['coverage_area'] = record.get('承保地區範圍名稱')
            record['continent'] = record.get('所處洲')
            record['country'] = record.get('國家或地區')
            record['currency'] = record.get('保單幣別')
            record['building_replacement_value'] = record.get('共保前建築重置價值')
            record['contents_value'] = record.get('共保前室內財物價值')
            record['total_sum_insured_gross'] = record.get('共保前總保險金額')
            record['share_percentage'] = record.get('承保份額')
            record['deductible_info'] = record.get('免賠信息')

            # Track if original district exists
            has_original_district = bool(record.get('region'))
            if has_original_district:
                self.stats['has_original_district'] += 1

            # Geocode address
            address = record.get('address')
            if address and str(address).strip():
                logger.info(f"[{idx+1}/{len(df_policy)}] Geocoding: {str(address)[:50]}...")

                geocoding = self.geocoding_service.geocode(str(address), record.get('region'))

                if geocoding:
                    record['location'] = geocoding

                    # Extract district if not present
                    if not has_original_district:
                        # Try to extract from geocoding result
                        district = extract_district_from_google_result(geocoding)

                        if district:
                            record['region'] = district
                            record['district_source'] = 'geocoding_api'
                            self.stats['district_from_geocoding'] += 1
                            logger.info(f"  ✓ 从geocoding提取分区: {district}")
                        else:
                            # Fallback: extract from address text
                            district = extract_district_from_address(str(address))
                            if district:
                                record['region'] = district
                                record['district_source'] = 'address_text'
                                self.stats['district_from_text'] += 1
                                logger.info(f"  ✓ 从地址文本提取分区: {district}")
                            else:
                                self.stats['no_district'] += 1
                                logger.warning(f"  ✗ 无法提取分区")
                    else:
                        record['district_source'] = 'original'
                else:
                    logger.warning(f"  ✗ Geocoding失败")
                    if not has_original_district:
                        self.stats['no_district'] += 1

            results.append(record)

            # Save intermediate results every 50 records
            if (idx + 1) % 50 == 0:
                self._save_intermediate(results, f"progress_{idx+1}")
                logger.info(f"✓ 已保存进度: {idx+1} 条记录")

        # Save final results
        df_results = pd.DataFrame(results)
        return df_results

    def _save_intermediate(self, results: List[Dict], suffix: str):
        """Save intermediate results"""
        output_file = OUTPUT_DIR / f"tphk-enhanced-{suffix}.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save intermediate results: {e}")

    def save_results(self, df: pd.DataFrame):
        """Save final results"""
        logger.info("="*60)
        logger.info("保存最终结果")
        logger.info("="*60)

        # Save as JSON
        json_file = OUTPUT_DIR / 'tphk-portfolio-enhanced.json'
        data = df.to_dict(orient='records')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ JSON: {json_file}")

        # Save as CSV
        csv_file = OUTPUT_DIR / 'tphk-portfolio-enhanced.csv'
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        logger.info(f"✓ CSV: {csv_file}")

        # Print statistics
        self.print_stats()

    def print_stats(self):
        """Print processing statistics"""
        logger.info("="*60)
        logger.info("处理统计")
        logger.info("="*60)
        logger.info(f"总记录数: {self.stats['total_records']}")
        logger.info(f"原始有分区: {self.stats['has_original_district']} ({self.stats['has_original_district']/self.stats['total_records']*100:.1f}%)")
        logger.info(f"从geocoding提取: {self.stats['district_from_geocoding']}")
        logger.info(f"从地址文本提取: {self.stats['district_from_text']}")
        logger.info(f"仍无分区: {self.stats['no_district']}")

        total_with_district = self.stats['has_original_district'] + self.stats['district_from_geocoding'] + self.stats['district_from_text']
        logger.info(f"\n最终有分区: {total_with_district} ({total_with_district/self.stats['total_records']*100:.1f}%)")
        logger.info("="*60)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Enhanced TPHK geocoding with district extraction')
    parser.add_argument('--limit', type=int, help='Limit number of records to process')
    parser.add_argument('--test', action='store_true', help='Test mode: process only 10 records')

    args = parser.parse_args()

    max_records = None
    if args.test:
        max_records = 10
        logger.info("TEST MODE: Processing only 10 records")
    elif args.limit:
        max_records = args.limit
        logger.info(f"LIMITED MODE: Processing {max_records} records")

    geocoder = TPHKEnhancedGeocoder()

    # Load and geocode data
    df = geocoder.load_and_geocode_data(max_records=max_records)

    # Save results
    geocoder.save_results(df)

    logger.info("\n✅ 处理完成！")


if __name__ == '__main__':
    main()
