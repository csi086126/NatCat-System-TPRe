"""
从已存在的Store发布Coverage图层到GeoServer
"""

import requests
import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

def publish_layers_from_stores():
    """从已创建的Store发布图层"""

    # 从环境变量读取认证信息
    username = os.getenv('GEOSERVER_USER', 'chensi')
    password = os.getenv('GEOSERVER_PASS', '')
    geoserver_url = os.getenv('GEOSERVER_URL', 'http://localhost:8080/geoserver')

    auth = (username, password)
    base_url = f"{geoserver_url}/rest"
    
    # 6个TIF对应的Store名称
    stores = [
        'Hato_MacauPeninsula_WGS84',
        'Hato_Taipa_WGS84',
        'Mangkhut_MacauPeninsula_WGS84',
        'Mangkhut_Taipa_WGS84',
        'Ragasa_MacauPeninsula_WGS84',
        'Ragasa_Taipa_WGS84'
    ]
    
    workspace = 'Macau'
    success_count = 0
    
    print("Publishing layers from existing stores...\n")
    
    for store_name in stores:
        layer_name = store_name.replace('_WGS84', '')  # 去掉后缀
        
        # 检查Store是否存在
        check_url = f"{base_url}/workspaces/{workspace}/coveragestores/{store_name}.json"
        response = requests.get(check_url, auth=auth)
        
        if response.status_code != 200:
            print(f"[SKIP] Store '{store_name}' not found")
            continue
        
        # 检查图层是否已存在
        layer_check_url = f"{base_url}/layers/{workspace}:{layer_name}.json"
        layer_response = requests.get(layer_check_url, auth=auth)
        
        if layer_response.status_code == 200:
            print(f"[OK] Layer '{layer_name}' already exists")
            success_count += 1
            continue
        
        # 发布Coverage
        publish_url = f"{base_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages"
        
        data = {
            "coverage": {
                "name": layer_name,
                "title": layer_name.replace('_', ' '),
                "enabled": True
            }
        }
        
        response = requests.post(
            publish_url,
            auth=auth,
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            print(f"[OK] Published layer '{layer_name}'")
            success_count += 1
        else:
            print(f"[ERROR] Failed to publish '{layer_name}': {response.status_code}")
            print(f"  Response: {response.text[:200]}")
    
    print(f"\n{'='*60}")
    print(f"Published {success_count} / {len(stores)} layers")
    print(f"{'='*60}")
    
    if success_count > 0:
        print("\nYou can now view the layers:")
        print("  http://localhost:8080/geoserver/web")
        print("\nWMS Service URL:")
        print(f"  http://localhost:8080/geoserver/{workspace}/wms")
        print("\nLayer names:")
        for store_name in stores:
            layer_name = store_name.replace('_WGS84', '')
            print(f"  - {workspace}:{layer_name}")

if __name__ == "__main__":
    publish_layers_from_stores()
