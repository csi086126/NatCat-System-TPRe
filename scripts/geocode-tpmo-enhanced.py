#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced TPMO (Macau) Geocoding with Parish Extraction
自动从地址提取并补充澳门堂区信息（7个堂区）
Based on: geocode-tphk-enhanced.py
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

# Add scripts directory to path
script_dir = Path(__file__).parent
ui_system_dir = script_dir.parent
sys.path.append(str(script_dir))

# Load environment variables from .env.local FIRST
env_file = ui_system_dir / '.env.local'
if env_file.exists():
    load_dotenv(env_file, override=True)
    print(f"Loaded environment from: {env_file}")
else:
    load_dotenv()
    print("Using default .env file")

# Verify API keys
print(f"AMAP_API_KEY: {'configured' if os.getenv('AMAP_API_KEY') else 'NOT FOUND'}")
print(f"GOOGLE_MAPS_API_KEY: {'configured' if os.getenv('GOOGLE_MAPS_API_KEY') else 'NOT FOUND'}")

from geocoding_service import GeocodingService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tpmo-geocoding-enhanced.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# File paths
DATA_DIR = Path(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPMO")
POLICY_FILE = DATA_DIR / "承保信息.xlsx"
OUTPUT_DIR = Path(r"D:\Nat Cat Platform\UI_system\public\data\macau")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 澳门7个堂区中英文对照
MACAU_PARISHES_MAPPING = {
    # 澳门半岛 5个堂区
    '花地玛堂区': {'id': 1, 'name': 'Nossa Senhora de Fátima', 'nameEN': 'Our Lady of Fatima', 'nameCN': '花地玛堂区', 'area': '澳门半岛'},
    '圣安多尼堂区': {'id': 2, 'name': 'Santo António', 'nameEN': 'St. Anthony', 'nameCN': '圣安多尼堂区', 'area': '澳门半岛'},
    '望德堂区': {'id': 3, 'name': 'São Lázaro', 'nameEN': 'St. Lazarus', 'nameCN': '望德堂区', 'area': '澳门半岛'},
    '大堂区': {'id': 4, 'name': 'Sé', 'nameEN': 'Cathedral', 'nameCN': '大堂区', 'area': '澳门半岛'},
    '圣老楞佐堂区': {'id': 5, 'name': 'São Lourenço', 'nameEN': 'St. Lawrence', 'nameCN': '圣老楞佐堂区', 'area': '澳门半岛'},
    # 离岛 2个堂区
    '嘉模堂区': {'id': 6, 'name': 'Nossa Senhora do Carmo', 'nameEN': 'Our Lady of Carmel', 'nameCN': '嘉模堂区', 'area': '氹仔'},
    '圣方济各堂区': {'id': 7, 'name': 'São Francisco Xavier', 'nameEN': 'St. Francis Xavier', 'nameCN': '圣方济各堂区', 'area': '路环'},
}

# 澳门堂区关键词（用于从地址文本提取）
PARISH_KEYWORDS = {
    # 花地玛堂区 (Nossa Senhora de Fátima) - 北部
    '花地玛堂区': ['花地玛', 'Fátima', 'Fatima', '台山', '筷子基', '青洲', '黑沙环', '祐汉', '马场'],

    # 圣安多尼堂区 (Santo António) - 西北部
    '圣安多尼堂区': ['圣安多尼', 'António', 'Antonio', 'St. Anthony', '新桥', '沙梨头', '白鸽巢', '水坑尾'],

    # 望德堂区 (São Lázaro) - 东北部
    '望德堂区': ['望德', 'Lázaro', 'Lazaro', 'St. Lazarus', '荷兰园', '塔石', '东望洋', '二龙喉'],

    # 大堂区 (Sé) - 中部/东南部
    '大堂区': ['大堂', 'Sé', 'Cathedral', '新马路', '板樟堂', '南湾', '议事亭', '大三巴', '营地', '妈阁'],

    # 圣老楞佐堂区 (São Lourenço) - 西南部
    '圣老楞佐堂区': ['圣老楞佐', 'Lourenço', 'Lourenco', 'St. Lawrence', '风顺堂', '西湾', '南西湾', '河边新街', '司打口'],

    # 嘉模堂区 (Nossa Senhora do Carmo) - 氹仔
    '嘉模堂区': ['嘉模', 'Carmo', 'Our Lady of Carmel', '氹仔', 'Taipa', '官也街', '龙环葡韵', '北安', '海洋花园'],

    # 圣方济各堂区 (São Francisco Xavier) - 路环
    '圣方济各堂区': ['圣方济各', 'Francisco Xavier', 'St. Francis Xavier', '路环', 'Coloane', '黑沙', '竹湾', '九澳', '石排湾'],
}


def extract_parish_from_address(address: str) -> Optional[str]:
    """
    从地址文本中提取澳门堂区（基于关键词匹配）
    """
    if not address:
        return None

    address_upper = str(address).upper()

    # 按优先级匹配（从具体到一般）
    for parish, keywords in PARISH_KEYWORDS.items():
        for keyword in keywords:
            if keyword.upper() in address_upper:
                return parish

    return None


def extract_parish_from_geocoding_result(geocoding_result: Dict) -> Optional[str]:
    """
    从Geocoding API返回结果中提取澳门堂区
    """
    if not geocoding_result:
        return None

    # 如果结果中已经有parish字段，直接返回
    if 'parish' in geocoding_result:
        return geocoding_result['parish']

    # 从formatted_address尝试提取
    formatted_addr = geocoding_result.get('formatted_address', '')
    parish_from_text = extract_parish_from_address(formatted_addr)
    if parish_from_text:
        return parish_from_text

    return None


class TPMOEnhancedGeocoder:
    """Enhanced geocoder for TPMO with parish extraction"""

    def __init__(self):
        """Initialize geocoder"""
        self.geocoding_service = GeocodingService(
            cache_file=str(OUTPUT_DIR / 'tpmo-geocoding-cache.json')
        )
        self.stats = {
            'total_records': 0,
            'has_original_parish': 0,
            'parish_from_geocoding': 0,
            'parish_from_text': 0,
            'no_parish': 0
        }

    def load_and_geocode_data(self, max_records: Optional[int] = None) -> pd.DataFrame:
        """
        Load Excel data and perform geocoding with parish extraction

        Args:
            max_records: Maximum number of records to process (None = all)

        Returns:
            DataFrame with geocoded data and parish information
        """
        logger.info("="*60)
        logger.info("开始加载和处理TPMO数据")
        logger.info("="*60)

        # Read policy data
        logger.info(f"读取承保数据: {POLICY_FILE}")
        xls = pd.ExcelFile(POLICY_FILE)
        logger.info(f"可用的sheet: {xls.sheet_names}")

        # Use the first sheet (Result 1)
        df_policy = pd.read_excel(POLICY_FILE, sheet_name=xls.sheet_names[0])

        if max_records:
            df_policy = df_policy.head(max_records)
            logger.info(f"限制处理前 {max_records} 条记录")

        logger.info(f"共 {len(df_policy)} 条记录")
        logger.info(f"共 {len(df_policy.columns)} 列")

        # Display all column names
        logger.info("\n所有列名:")
        for i, col in enumerate(df_policy.columns, 1):
            logger.info(f"  {i:2}. {col}")

        # Parse date column
        if '保单起期' in df_policy.columns:
            df_policy['保单起期'] = pd.to_datetime(df_policy['保单起期'], errors='coerce')
            df_policy['policy_year'] = df_policy['保单起期'].dt.year

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
                elif isinstance(value, pd.Timestamp):
                    record[col] = value.isoformat()
                else:
                    record[col] = str(value)

            # 添加标准化字段名（英文，便于前端使用）
            record['policy_no'] = record.get('policyno')
            record['address'] = record.get('标的位置')
            record['insured'] = record.get('被保险人')
            record['policy_start'] = record.get('保单起期')
            record['policy_end'] = record.get('保单止期')
            record['insurance_type'] = record.get('险种')
            record['structure'] = record.get('建筑结构')
            record['occupation'] = record.get('占用性质_occupation')
            record['occupation_desc'] = record.get('占用性质_occupationdesc')
            record['sum_insured_100'] = record.get('保额（100%）')
            record['share_percentage'] = record.get('承保份额')
            record['company_sum_insured'] = record.get('公司保额')
            record['catastrophe'] = record.get('catastrophe')
            record['property_type'] = record.get('propertytype')
            record['flat_level'] = record.get('flatlevel')
            record['year'] = record.get('policy_year')

            # Initialize parish field
            record['parish'] = None
            has_original_parish = False  # TPMO data doesn't have parish info originally

            # Geocode address
            address = record.get('address')
            if address and str(address).strip():
                logger.info(f"[{idx+1}/{len(df_policy)}] Geocoding: {str(address)[:60]}...")

                geocoding = self.geocoding_service.geocode(str(address), '澳门')

                if geocoding:
                    record['location'] = geocoding

                    # Extract parish from geocoding result or address text
                    parish = extract_parish_from_geocoding_result(geocoding)

                    if parish:
                        record['parish'] = parish
                        record['parish_source'] = 'geocoding_api'
                        self.stats['parish_from_geocoding'] += 1
                        logger.info(f"  ✓ 从geocoding提取堂区: {parish}")
                    else:
                        # Fallback: extract from address text
                        parish = extract_parish_from_address(str(address))
                        if parish:
                            record['parish'] = parish
                            record['parish_source'] = 'address_text'
                            self.stats['parish_from_text'] += 1
                            logger.info(f"  ✓ 从地址文本提取堂区: {parish}")
                        else:
                            self.stats['no_parish'] += 1
                            logger.warning(f"  ✗ 无法提取堂区")
                else:
                    logger.warning(f"  ✗ Geocoding失败")
                    self.stats['no_parish'] += 1

            results.append(record)

            # Save intermediate results every 100 records
            if (idx + 1) % 100 == 0:
                self._save_intermediate(results, f"progress_{idx+1}")
                logger.info(f"✓ 已保存进度: {idx+1} 条记录")

        # Save final results
        df_results = pd.DataFrame(results)
        return df_results

    def _save_intermediate(self, results: List[Dict], suffix: str):
        """Save intermediate results"""
        output_file = OUTPUT_DIR / f"tpmo-enhanced-{suffix}.json"
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
        json_file = OUTPUT_DIR / 'tpmo-portfolio-enhanced.json'
        data = df.to_dict(orient='records')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ JSON: {json_file}")

        # Save as CSV
        csv_file = OUTPUT_DIR / 'tpmo-portfolio-enhanced.csv'
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        logger.info(f"✓ CSV: {csv_file}")

        # Create GeoJSON with all properties
        self._create_geojson(df)

        # Print statistics
        self.print_stats()

    def _create_geojson(self, df: pd.DataFrame):
        """Create GeoJSON with all original columns preserved"""
        logger.info("="*60)
        logger.info("生成GeoJSON文件（保留所有列）")
        logger.info("="*60)

        features = []

        for idx, row in df.iterrows():
            location = row.get('location')

            # Skip if no location
            if not location or pd.isna(location):
                continue

            # Extract coordinates
            try:
                if isinstance(location, str):
                    location = json.loads(location.replace("'", '"'))

                lat = location.get('lat')
                lng = location.get('lng')

                if not lat or not lng:
                    continue

                # Build properties with ALL columns
                properties = {}
                for col in df.columns:
                    if col == 'location':  # Skip the nested location object
                        continue

                    value = row.get(col)

                    # Handle different data types for JSON serialization
                    if pd.isna(value):
                        properties[col] = None
                    elif isinstance(value, (int, float)):
                        properties[col] = float(value) if not pd.isna(value) else None
                    elif isinstance(value, pd.Timestamp):
                        properties[col] = value.isoformat()
                    elif isinstance(value, dict):
                        properties[col] = value
                    else:
                        properties[col] = str(value)

                # Add geocoding metadata
                properties['geocoding_provider'] = location.get('provider', '')
                properties['formatted_address'] = location.get('formatted_address', '')

                # Add parish metadata if available
                if row.get('parish'):
                    parish_info = MACAU_PARISHES_MAPPING.get(row['parish'], {})
                    properties['parish_id'] = parish_info.get('id')
                    properties['parish_name'] = parish_info.get('name')
                    properties['parish_name_en'] = parish_info.get('nameEN')
                    properties['parish_name_cn'] = parish_info.get('nameCN')
                    properties['parish_area'] = parish_info.get('area')

                feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lng, lat]
                    },
                    'properties': properties
                }
                features.append(feature)

            except Exception as e:
                logger.warning(f"Failed to process row {idx}: {e}")
                continue

        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'region': 'Macau',
                'source': 'TPMO',
                'total_records': len(df),
                'geocoded': len(features),
                'success_rate': len(features) / len(df) * 100 if len(df) > 0 else 0,
                'generated_at': datetime.now().isoformat(),
                'parishes': list(MACAU_PARISHES_MAPPING.keys())
            }
        }

        # Save GeoJSON
        geojson_file = OUTPUT_DIR / 'tpmo-portfolio-enhanced.geojson'
        with open(geojson_file, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ GeoJSON: {geojson_file}")
        logger.info(f"  Features: {len(features)}")
        logger.info(f"  Success rate: {geojson['metadata']['success_rate']:.1f}%")

    def print_stats(self):
        """Print processing statistics"""
        logger.info("="*60)
        logger.info("处理统计")
        logger.info("="*60)
        logger.info(f"总记录数: {self.stats['total_records']}")
        logger.info(f"从geocoding提取堂区: {self.stats['parish_from_geocoding']}")
        logger.info(f"从地址文本提取堂区: {self.stats['parish_from_text']}")
        logger.info(f"仍无堂区: {self.stats['no_parish']}")

        total_with_parish = self.stats['parish_from_geocoding'] + self.stats['parish_from_text']
        if self.stats['total_records'] > 0:
            logger.info(f"\n最终有堂区: {total_with_parish} ({total_with_parish/self.stats['total_records']*100:.1f}%)")
        logger.info("="*60)

        # Print parish distribution
        logger.info("\n澳门7个堂区:")
        for parish, info in MACAU_PARISHES_MAPPING.items():
            logger.info(f"  {info['id']}. {info['nameCN']} ({info['nameEN']}) - {info['area']}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Enhanced TPMO geocoding with parish extraction')
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

    geocoder = TPMOEnhancedGeocoder()

    # Load and geocode data
    df = geocoder.load_and_geocode_data(max_records=max_records)

    # Save results
    geocoder.save_results(df)

    logger.info("\n✅ 处理完成！")


if __name__ == '__main__':
    main()
