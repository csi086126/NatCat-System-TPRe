#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive test script for both Google Maps and Amap geocoding APIs
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


def test_google_api():
    """Test Google Maps Geocoding API"""
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')

    print("="*60)
    print("Google Maps API 测试")
    print("="*60)
    print()

    if not api_key or api_key == '你的Google_Maps_API密钥':
        print("⚠️  Google Maps API密钥未配置")
        print()
        return False

    print(f"✓ API密钥已配置: {api_key[:15]}...")
    print()

    # Test with Hong Kong address
    test_address = "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T."
    print(f"测试地址: {test_address}")
    print()

    try:
        endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'address': test_address,
            'key': api_key,
            'language': 'en',
            'region': 'hk'
        }

        print("发送请求到Google Maps API...")
        response = requests.get(endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        print(f"✓ API响应状态: {data.get('status')}")
        print()

        if data['status'] == 'OK' and data['results']:
            result = data['results'][0]
            location = result['geometry']['location']

            print("="*60)
            print("✅ Google Maps 测试成功！")
            print("="*60)
            print(f"原始地址: {test_address[:50]}...")
            print(f"标准地址: {result['formatted_address']}")
            print(f"纬度: {location['lat']}")
            print(f"经度: {location['lng']}")
            print(f"Place ID: {result.get('place_id', 'N/A')}")
            print()
            return True

        elif data['status'] == 'REQUEST_DENIED':
            print("="*60)
            print("❌ Google Maps API 访问被拒绝")
            print("="*60)
            print(f"错误信息: {data.get('error_message', 'Unknown error')}")
            print()
            print("可能的原因:")
            print("1. API密钥无效或已过期")
            print("2. 未启用 Geocoding API")
            print("3. API密钥有使用限制（IP白名单等）")
            print()
            print("解决方法:")
            print("1. 访问: https://console.cloud.google.com/google/maps-apis/")
            print("2. 确认 'Geocoding API' 已启用")
            print("3. 检查API密钥设置")
            return False

        elif data['status'] == 'OVER_QUERY_LIMIT':
            print("⚠️  配额已用完（今日/每秒请求数超限）")
            return False

        else:
            print(f"⚠️  API返回状态: {data['status']}")
            print(f"详情: {data.get('error_message', 'No details')}")
            return False

    except Exception as e:
        print("="*60)
        print("❌ Google Maps 请求失败")
        print("="*60)
        print(f"错误: {e}")
        return False


def test_amap_api():
    """Test Amap (高德地图) Geocoding API"""
    api_key = os.getenv('AMAP_API_KEY')

    print("="*60)
    print("高德地图API 测试")
    print("="*60)
    print()

    if not api_key or api_key == '你的高德地图API密钥':
        print("⚠️  高德地图API密钥未配置")
        print()
        return False

    print(f"✓ API密钥已配置: {api_key[:10]}...")
    print()

    # Test with Hong Kong address (Chinese)
    test_address = "香港葵涌永基路2-12号合和实业中心8楼"
    print(f"测试地址: {test_address}")
    print()

    try:
        endpoint = "https://restapi.amap.com/v3/geocode/geo"
        params = {
            'address': test_address,
            'key': api_key,
            'output': 'json'
        }

        print("发送请求到高德地图API...")
        response = requests.get(endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        print(f"✓ API响应状态: {data.get('status')}")
        print()

        if data['status'] == '1' and data.get('geocodes'):
            geocode = data['geocodes'][0]
            location = geocode['location'].split(',')

            print("="*60)
            print("✅ 高德地图 测试成功！")
            print("="*60)
            print(f"原始地址: {test_address}")
            print(f"标准地址: {geocode.get('formatted_address', 'N/A')}")
            print(f"经度: {location[0]}")
            print(f"纬度: {location[1]}")
            print(f"省份: {geocode.get('province', 'N/A')}")
            print(f"城市: {geocode.get('city', 'N/A')}")
            print(f"区域代码: {geocode.get('adcode', 'N/A')}")
            print()
            return True

        elif data['status'] == '0':
            info = data.get('info', '')
            infocode = data.get('infocode', '')

            print("="*60)
            print("❌ 高德地图API 调用失败")
            print("="*60)
            print(f"错误信息: {info}")
            print(f"错误代码: {infocode}")
            print()

            if infocode == '10001':
                print("原因: API密钥无效")
                print("解决: 检查密钥是否正确，是否为'Web服务'类型")
            elif infocode == '10009':
                print("原因: 密钥类型不匹配")
                print("解决: 必须使用'Web服务API'密钥，不是'Web端(JS API)'")
            elif infocode == '10003':
                print("原因: 今日配额已用完")

            return False

        else:
            print(f"⚠️  未找到结果或其他错误")
            return False

    except Exception as e:
        print("="*60)
        print("❌ 高德地图 请求失败")
        print("="*60)
        print(f"错误: {e}")
        return False


def main():
    """Main test function"""
    print()
    print("╔" + "="*58 + "╗")
    print("║" + " "*15 + "Geocoding API 综合测试" + " "*21 + "║")
    print("╚" + "="*58 + "╝")
    print()

    # Test both APIs
    google_ok = test_google_api()
    print()
    amap_ok = test_amap_api()

    # Summary
    print()
    print("="*60)
    print("测试总结")
    print("="*60)

    if google_ok and amap_ok:
        print("✅ Google Maps: 成功")
        print("✅ 高德地图: 成功")
        print()
        print("🎉 太好了！两个API都配置正确！")
        print()
        print("推荐策略:")
        print("- Google Maps 作为主要服务（精度高，适合香港英文地址）")
        print("- 高德地图作为备用服务（免费额度大）")
    elif google_ok:
        print("✅ Google Maps: 成功")
        print("❌ 高德地图: 失败")
        print()
        print("📌 Google Maps已配置，可以开始使用")
        print("   高德地图暂时不可用，但不影响主要功能")
    elif amap_ok:
        print("❌ Google Maps: 失败")
        print("✅ 高德地图: 成功")
        print()
        print("📌 高德地图已配置，可以使用")
        print("   建议修复Google Maps配置以获得更好效果")
    else:
        print("❌ Google Maps: 失败")
        print("❌ 高德地图: 失败")
        print()
        print("⚠️  两个API都未正确配置")
        print()
        print("请检查:")
        print("1. .env 文件中API密钥是否正确填写")
        print("2. 网络连接是否正常")
        print("3. API密钥是否已激活")

    print("="*60)
    print()

    if google_ok or amap_ok:
        print("✅ 准备就绪！可以运行完整geocoding:")
        print()
        print("   测试命令:")
        print("   python scripts/geocode-tphk-portfolio.py --test")
        print()
        print("   完整处理:")
        print("   python scripts/geocode-tphk-portfolio.py")
    else:
        print("❌ 请先配置至少一个API密钥")
        print()
        print("配置文件: D:\\Nat Cat Platform\\UI_system\\.env")

    print()
    input("按回车键退出...")


if __name__ == '__main__':
    main()
