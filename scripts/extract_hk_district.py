#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract Hong Kong district from Google Maps geocoding results
从Google Maps API返回的地址组件中提取香港分区
"""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

def extract_hk_district_from_google(address: str, google_api_key: str) -> dict:
    """
    使用Google Maps API获取地址的详细组件，提取香港分区

    Returns:
        {
            'district': '葵青區',  # 中文区名
            'district_en': 'Kwai Tsing',  # 英文区名
            'sublocality': 'Kwai Chung',  # 更详细的地区
            'lat': 22.358,
            'lng': 114.118
        }
    """
    endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': address,
        'key': google_api_key,
        'language': 'en',
        'region': 'hk'
    }

    try:
        response = requests.get(endpoint, params=params, timeout=10)
        data = response.json()

        if data['status'] == 'OK' and data['results']:
            result = data['results'][0]
            components = result['address_components']

            district_info = {
                'district': None,
                'district_en': None,
                'sublocality': None,
                'lat': result['geometry']['location']['lat'],
                'lng': result['geometry']['location']['lng']
            }

            # 香港18区的中英文对照
            hk_districts_mapping = {
                # 香港岛
                'Central and Western': '中西區',
                'Eastern': '東區',
                'Southern': '南區',
                'Wan Chai': '灣仔區',
                # 九龙
                'Kowloon City': '九龍城區',
                'Kwun Tong': '觀塘區',
                'Sham Shui Po': '深水埗區',
                'Wong Tai Sin': '黃大仙區',
                'Yau Tsim Mong': '油尖旺區',
                # 新界
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

            # 遍历地址组件提取信息
            for component in components:
                types = component['types']

                # 提取行政区级别的信息
                if 'administrative_area_level_2' in types:
                    district_en = component['long_name']
                    district_info['district_en'] = district_en
                    # 转换为中文
                    district_info['district'] = hk_districts_mapping.get(district_en, district_en)

                # 提取sublocality（更详细的地区，如Kwai Chung）
                if 'sublocality_level_1' in types or 'sublocality' in types:
                    district_info['sublocality'] = component['long_name']

            return district_info

    except Exception as e:
        print(f"Error: {e}")
        return None


def extract_hk_district_from_address_text(address: str) -> str:
    """
    从地址文本中直接提取香港分区（不调用API）
    基于地址中的地名关键词匹配
    """
    # 香港18区的关键词列表
    district_keywords = {
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

    address_upper = address.upper()

    for district, keywords in district_keywords.items():
        for keyword in keywords:
            if keyword.upper() in address_upper:
                return district

    return None


# 测试示例
if __name__ == '__main__':
    # 测试地址
    test_addresses = [
        "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.",
        "HOUSE K35 MARINA COVE 380 HIRAM'S HIGHWAY SAI KUNG KOWLOON",
        "FLAT A 10/F TOWER 1 METRO HARBOUR VIEW 8 FUNG SHUE WO ROAD TSUEN WAN NT",
        "Causeway Bay, Hong Kong"
    ]

    google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')

    print("="*60)
    print("香港分区提取测试")
    print("="*60)

    for address in test_addresses:
        print(f"\n地址: {address}")
        print("-"*60)

        # 方法1: 从地址文本直接提取（快速，无API调用）
        district_text = extract_hk_district_from_address_text(address)
        print(f"[文本匹配] 分区: {district_text}")

        # 方法2: 使用Google API（准确，需API调用）
        if google_api_key:
            district_info = extract_hk_district_from_google(address, google_api_key)
            if district_info:
                print(f"[Google API] 分区: {district_info['district']} ({district_info['district_en']})")
                print(f"            详细地区: {district_info['sublocality']}")
                print(f"            坐标: {district_info['lat']}, {district_info['lng']}")

    print("\n" + "="*60)
