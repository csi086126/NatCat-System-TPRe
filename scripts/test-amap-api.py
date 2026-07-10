#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick test script for Amap geocoding API
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def test_amap_api():
    """Test Amap API with a simple Hong Kong address"""

    api_key = os.getenv('AMAP_API_KEY')

    print("="*60)
    print("高德地图API测试")
    print("="*60)
    print()

    # Check if API key is configured
    if not api_key or api_key == '你的高德地图API密钥':
        print("❌ 错误: 未配置高德地图API密钥")
        print()
        print("请编辑 .env 文件，将你的API密钥填入：")
        print(f"文件位置: {env_path}")
        print()
        print("修改这一行：")
        print("AMAP_API_KEY=你的高德地图API密钥")
        print()
        print("改为：")
        print("AMAP_API_KEY=你从高德控制台获取的实际密钥")
        return False

    print(f"✓ API密钥已配置: {api_key[:10]}...")
    print()

    # Test with a Hong Kong address
    test_address = "香港葵涌永基路2-12号合和实业中心8楼"
    print(f"测试地址: {test_address}")
    print()

    try:
        # Make API request
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

        if data['status'] == '1':
            if data.get('geocodes') and len(data['geocodes']) > 0:
                geocode = data['geocodes'][0]
                location = geocode['location'].split(',')

                print("="*60)
                print("✅ 测试成功！")
                print("="*60)
                print(f"地址: {geocode.get('formatted_address', test_address)}")
                print(f"经度: {location[0]}")
                print(f"纬度: {location[1]}")
                print(f"省份: {geocode.get('province', 'N/A')}")
                print(f"城市: {geocode.get('city', 'N/A')}")
                print(f"区域代码: {geocode.get('adcode', 'N/A')}")
                print()
                print("🎉 你的高德地图API配置正确！")
                print("现在可以运行完整的geocoding脚本了。")
                print()
                return True
            else:
                print("⚠️  警告: API返回成功但没有找到结果")
                print("这可能是因为:")
                print("1. 地址格式不正确")
                print("2. 高德地图数据库中没有这个地址")
                print()
                print("但你的API密钥是有效的，可以继续使用。")
                return True
        elif data['status'] == '0':
            info = data.get('info', '')
            infocode = data.get('infocode', '')

            print("="*60)
            print("❌ API调用失败")
            print("="*60)
            print(f"错误信息: {info}")
            print(f"错误代码: {infocode}")
            print()

            # Common error messages
            if 'INVALID_USER_KEY' in info or infocode == '10001':
                print("❌ API密钥无效")
                print()
                print("请检查：")
                print("1. 密钥是否正确复制（没有多余空格）")
                print("2. 是否使用了'Web服务API'类型的密钥")
                print("3. 密钥是否已在高德控制台激活")
                print()
                print("获取密钥: https://console.amap.com/dev/key/app")
            elif 'DAILY_QUERY_OVER_LIMIT' in info or infocode == '10003':
                print("❌ 今日配额已用完")
                print("免费版每天30万次请求")
            elif 'USERKEY_PLAT_NOMATCH' in info or infocode == '10009':
                print("❌ 密钥类型不匹配")
                print("请确保使用的是'Web服务API'密钥，而不是'Web端(JS API)'")

            return False

    except requests.exceptions.RequestException as e:
        print("="*60)
        print("❌ 网络请求失败")
        print("="*60)
        print(f"错误: {e}")
        print()
        print("请检查:")
        print("1. 网络连接是否正常")
        print("2. 是否可以访问 restapi.amap.com")
        return False

    except Exception as e:
        print("="*60)
        print("❌ 未知错误")
        print("="*60)
        print(f"错误: {e}")
        return False


if __name__ == '__main__':
    success = test_amap_api()

    if success:
        print()
        print("下一步:")
        print("1. 运行完整geocoding: python scripts/geocode-tphk-portfolio.py --test")
        print("2. 处理全部数据: python scripts/geocode-tphk-portfolio.py")
    else:
        print()
        print("请先解决上述问题，然后重新运行此测试脚本")

    print()
    input("按回车键退出...")
