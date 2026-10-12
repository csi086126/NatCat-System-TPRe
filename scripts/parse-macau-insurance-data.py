"""
Macau Insurance Data Parser
解析澳门台风保险承保和理赔数据

功能：
1. 读取承保信息.xlsx和理赔信息(巨災).xlsx
2. 提取地址、保单号、保额、赔付金额等信息
3. 使用Macau GIS API进行地理编码
4. 输出为GeoJSON格式，用于地图展示

使用方法：
python scripts/parse-macau-insurance-data.py
"""

import pandas as pd
import json
import requests
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Macau GIS API Configuration
MACAU_GIS_SEARCH_API = "https://api.gis.gov.mo/dataservice/findResults"
MACAU_GIS_COORD_API = "https://api.gis.gov.mo/Coordinate/ToLatLng"

# Data paths
BASE_DIR = Path(__file__).parent.parent
INSURANCE_DATA_DIR = Path(os.getenv("INSURANCE_DATA_DIR", "D:/web-flood-insurance-model/Data/Insurance_data"))
OUTPUT_DIR = BASE_DIR / "public" / "data"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def geocode_macau_address(address: str, max_retries: int = 3) -> Optional[Tuple[float, float]]:
    """
    使用Macau GIS API进行地理编码
    
    Args:
        address: 澳门地址（中文或葡文）
        max_retries: 最大重试次数
    
    Returns:
        (latitude, longitude) 或 None（如果失败）
    """
    for attempt in range(max_retries):
        try:
            # Step 1: Search for address
            search_params = {
                'word': address,
                'lang': 'zh-CN',  # 简体中文 / 也可以用 'zh-TW' (繁体) 或 'pt' (葡文)
                'limit': 1  # 只取第一个结果
            }
            
            search_response = requests.get(
                MACAU_GIS_SEARCH_API, 
                params=search_params,
                timeout=10
            )
            
            if search_response.status_code != 200:
                print(f"  ⚠️ Search API failed for '{address}': HTTP {search_response.status_code}")
                time.sleep(1)
                continue
            
            search_data = search_response.json()
            
            # Check if results exist
            if not search_data or 'results' not in search_data or len(search_data['results']) == 0:
                print(f"  ❌ No results found for address: {address}")
                return None
            
            # Get first result
            result = search_data['results'][0]
            
            # Extract Macau local coordinates (x, y)
            x = result.get('x')
            y = result.get('y')
            
            if x is None or y is None:
                print(f"  ❌ No coordinates in result for: {address}")
                return None
            
            # Step 2: Convert Macau coordinates to WGS84 (lat/lng)
            coord_params = {
                'x': x,
                'y': y
            }
            
            coord_response = requests.get(
                MACAU_GIS_COORD_API,
                params=coord_params,
                timeout=10
            )
            
            if coord_response.status_code != 200:
                print(f"  ⚠️ Coordinate conversion failed: HTTP {coord_response.status_code}")
                time.sleep(1)
                continue
            
            coord_data = coord_response.json()
            
            lat = coord_data.get('latitude')
            lng = coord_data.get('longitude')
            
            if lat is None or lng is None:
                print(f"  ❌ Failed to convert coordinates for: {address}")
                return None
            
            print(f"  ✅ Geocoded '{address}' → ({lat}, {lng})")
            return (float(lat), float(lng))
            
        except requests.exceptions.RequestException as e:
            print(f"  ⚠️ Network error (attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(2)
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            return None
    
    print(f"  ❌ Failed to geocode after {max_retries} attempts: {address}")
    return None


def parse_policies_data(filepath: Path) -> pd.DataFrame:
    """
    解析承保信息.xlsx
    
    Returns:
        DataFrame with columns: policy_id, address, insured_amount, etc.
    """
    print(f"\n📂 Reading policies data from: {filepath}")
    
    try:
        df = pd.read_excel(filepath)
        print(f"✅ Loaded {len(df)} policy records")
        print(f"   Columns: {list(df.columns)}")
        return df
    except Exception as e:
        print(f"❌ Failed to read policies data: {e}")
        return pd.DataFrame()


def parse_claims_data(filepath: Path) -> pd.DataFrame:
    """
    解析理赔信息(巨災).xlsx
    
    Returns:
        DataFrame with columns: claim_id, policy_id, claim_amount, event_name, etc.
    """
    print(f"\n📂 Reading claims data from: {filepath}")
    
    try:
        df = pd.read_excel(filepath)
        print(f"✅ Loaded {len(df)} claim records")
        print(f"   Columns: {list(df.columns)}")
        return df
    except Exception as e:
        print(f"❌ Failed to read claims data: {e}")
        return pd.DataFrame()


def merge_and_geocode(policies_df: pd.DataFrame, claims_df: pd.DataFrame) -> List[Dict]:
    """
    合并承保和理赔数据，并进行地理编码
    
    Returns:
        List of geocoded insurance records
    """
    print(f"\n🔗 Merging policies and claims data...")
    
    # TODO: 根据实际Excel列名调整
    # 这里需要你提供实际的列名，比如：
    # - 保单号: '保单号' or 'PolicyNo'
    # - 地址: '地址' or 'Address' or '风险地址'
    # - 保额: '保额' or 'InsuredAmount'
    # - 赔付金额: '赔付金额' or 'ClaimAmount'
    # - 事件名称: '事件名称' or 'EventName'
    
    # For demonstration, assuming columns exist
    # You'll need to adjust based on actual column names
    
    geocoded_records = []
    
    # Process each policy with claims
    for idx, policy in policies_df.iterrows():
        try:
            # Extract policy info (adjust column names as needed)
            policy_id = policy.get('保单号') or policy.get('PolicyNo') or f"POL-{idx}"
            address = policy.get('地址') or policy.get('Address') or policy.get('风险地址')
            
            if not address or pd.isna(address):
                print(f"  ⚠️ Skipping policy {policy_id}: No address")
                continue
            
            # Geocode address
            coords = geocode_macau_address(str(address))
            
            if coords is None:
                print(f"  ⚠️ Skipping policy {policy_id}: Geocoding failed")
                continue
            
            lat, lng = coords
            
            # Find related claims
            related_claims = claims_df[claims_df['保单号'] == policy_id] if '保单号' in claims_df.columns else pd.DataFrame()
            
            total_claim_amount = related_claims['赔付金额'].sum() if '赔付金额' in related_claims.columns and len(related_claims) > 0 else 0
            
            # Build record
            record = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lng, lat]  # GeoJSON uses [lng, lat] order
                },
                'properties': {
                    'policyId': policy_id,
                    'address': str(address),
                    'insuredAmount': float(policy.get('保额', 0)) if '保额' in policy else 0,
                    'totalClaimAmount': float(total_claim_amount),
                    'claimsCount': len(related_claims),
                    'lossRatio': float(total_claim_amount / policy.get('保额', 1)) if '保额' in policy and policy.get('保额', 0) > 0 else 0,
                    # Add more fields as needed
                }
            }
            
            geocoded_records.append(record)
            
            # Rate limiting
            time.sleep(0.5)
            
        except Exception as e:
            print(f"  ❌ Error processing policy {idx}: {e}")
            continue
    
    print(f"\n✅ Successfully geocoded {len(geocoded_records)} policies")
    return geocoded_records


def generate_geojson_output(records: List[Dict], output_path: Path):
    """
    生成GeoJSON文件
    """
    geojson = {
        'type': 'FeatureCollection',
        'features': records,
        'metadata': {
            'title': 'Macau Typhoon Insurance Policies & Claims',
            'description': 'Geocoded insurance policies with claim data for Hato, Mangkhut, and Ragasa typhoons',
            'source': 'TPRe Macau Insurance Database',
            'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 GeoJSON saved to: {output_path}")


def generate_event_summary(claims_df: pd.DataFrame, output_path: Path):
    """
    生成每个台风事件的理赔统计汇总
    """
    # TODO: 根据实际列名调整
    # 假设理赔数据中有 '事件名称' 或 'EventName' 字段
    
    event_col = '事件名称' if '事件名称' in claims_df.columns else 'EventName' if 'EventName' in claims_df.columns else None
    
    if event_col is None:
        print("⚠️ No event name column found in claims data")
        return
    
    summary = {}
    
    for event_name in ['Hato', 'Mangkhut', 'Ragasa', '天鸽', '山竹', '桦加沙']:
        event_claims = claims_df[claims_df[event_col].str.contains(event_name, case=False, na=False)]
        
        if len(event_claims) == 0:
            continue
        
        summary[event_name] = {
            'totalClaims': int(len(event_claims)),
            'totalClaimAmount': float(event_claims['赔付金额'].sum()) if '赔付金额' in event_claims.columns else 0,
            'avgClaimAmount': float(event_claims['赔付金额'].mean()) if '赔付金额' in event_claims.columns else 0,
            'maxClaimAmount': float(event_claims['赔付金额'].max()) if '赔付金额' in event_claims.columns else 0
        }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Event summary saved to: {output_path}")


def main():
    """
    主函数
    """
    print("=" * 80)
    print("🌪️  Macau Typhoon Insurance Data Parser")
    print("=" * 80)
    
    # File paths
    policies_file = INSURANCE_DATA_DIR / "承保信息.xlsx"
    claims_file = INSURANCE_DATA_DIR / "理賠信息(巨災).xlsx"
    
    # Check if files exist
    if not policies_file.exists():
        print(f"❌ Policies file not found: {policies_file}")
        return
    
    if not claims_file.exists():
        print(f"❌ Claims file not found: {claims_file}")
        return
    
    # Parse data
    policies_df = parse_policies_data(policies_file)
    claims_df = parse_claims_data(claims_file)
    
    if policies_df.empty or claims_df.empty:
        print("❌ Failed to load data files")
        return
    
    # Display sample data structure
    print("\n📊 Sample Policy Data:")
    print(policies_df.head())
    
    print("\n📊 Sample Claims Data:")
    print(claims_df.head())
    
    # Ask user to confirm column names before geocoding
    print("\n" + "=" * 80)
    print("⚠️  IMPORTANT: Please verify the column names above match your expectations")
    print("    Adjust the column names in the merge_and_geocode() function if needed")
    print("=" * 80)
    
    user_input = input("\nProceed with geocoding? (yes/no): ")
    if user_input.lower() != 'yes':
        print("❌ Aborted by user")
        return
    
    # Merge and geocode
    geocoded_records = merge_and_geocode(policies_df, claims_df)
    
    # Generate outputs
    geojson_output = OUTPUT_DIR / "macau-insurance-policies.geojson"
    generate_geojson_output(geocoded_records, geojson_output)
    
    summary_output = OUTPUT_DIR / "macau-event-summary.json"
    generate_event_summary(claims_df, summary_output)
    
    print("\n" + "=" * 80)
    print("✅ Processing complete!")
    print(f"   - GeoJSON: {geojson_output}")
    print(f"   - Event Summary: {summary_output}")
    print("=" * 80)


if __name__ == "__main__":
    main()
