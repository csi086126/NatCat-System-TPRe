#!/usr/bin/env python3
"""
Create GeoServer style for Macau boundary lines (red and purple colors)
To match Hong Kong boundary style

Usage:
    python create-macau-boundary-style.py
"""

import requests
import os
from pathlib import Path

# GeoServer Configuration
GEOSERVER_URL = os.getenv('GEOSERVER_URL', 'http://10.253.22.15:8080/geoserver')
GEOSERVER_USER = os.getenv('GEOSERVER_USER', 'admin')
GEOSERVER_PASSWORD = os.getenv('GEOSERVER_PASSWORD', 'geoserver')

# Style SLD definition - Red boundary style (matching Hong Kong Districts)
MACAU_BOUNDARY_RED_SLD = '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>macau_boundary_red</Name>
    <UserStyle>
      <Title>Macau Boundary Style (Red)</Title>
      <Abstract>Red boundary line style matching Hong Kong 18 Districts</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>Red Boundary</Name>
          <Title>Red Boundary Line</Title>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#E53935</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
'''

# Style SLD definition - Purple boundary style (matching Hong Kong detailed boundaries)
MACAU_BOUNDARY_PURPLE_SLD = '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>macau_boundary_purple</Name>
    <UserStyle>
      <Title>Macau Boundary Style (Purple)</Title>
      <Abstract>Purple boundary line style matching Hong Kong TPU/Subunit</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>Purple Boundary</Name>
          <Title>Purple Boundary Line</Title>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#9575CD</CssParameter>
              <CssParameter name="stroke-width">1.5</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
'''

def create_style(style_name: str, sld_content: str):
    """Create or update a style in GeoServer"""
    
    workspace = 'macau'
    
    # Check if style exists in workspace
    check_url = f"{GEOSERVER_URL}/rest/workspaces/{workspace}/styles/{style_name}"
    response = requests.get(
        check_url,
        auth=(GEOSERVER_USER, GEOSERVER_PASSWORD)
    )
    
    if response.status_code == 200:
        print(f"⚠️  Style '{style_name}' already exists in workspace, updating...")
        # Update existing style
        update_url = f"{GEOSERVER_URL}/rest/workspaces/{workspace}/styles/{style_name}"
        response = requests.put(
            update_url,
            auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
            headers={'Content-Type': 'application/vnd.ogc.sld+xml'},
            data=sld_content.encode('utf-8')
        )
        if response.status_code == 200:
            print(f"✅ Style '{style_name}' updated successfully!")
            return True
        else:
            print(f"❌ Failed to update style: {response.status_code} - {response.text}")
            return False
    else:
        # Check global styles
        check_global_url = f"{GEOSERVER_URL}/rest/styles/{style_name}"
        response = requests.get(
            check_global_url,
            auth=(GEOSERVER_USER, GEOSERVER_PASSWORD)
        )
        
        if response.status_code == 200:
            print(f"⚠️  Style '{style_name}' exists globally, updating...")
            response = requests.put(
                check_global_url,
                auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
                headers={'Content-Type': 'application/vnd.ogc.sld+xml'},
                data=sld_content.encode('utf-8')
            )
            if response.status_code == 200:
                print(f"✅ Global style '{style_name}' updated!")
                return True
            else:
                print(f"❌ Failed to update global style: {response.status_code}")
                return False
        
        print(f"📝 Creating new style '{style_name}'...")
        
        # Try creating in workspace first
        create_url = f"{GEOSERVER_URL}/rest/workspaces/{workspace}/styles"
        style_json = {
            "style": {
                "name": style_name,
                "filename": f"{style_name}.sld"
            }
        }
        
        response = requests.post(
            create_url,
            auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
            headers={'Content-Type': 'application/json'},
            json=style_json
        )
        
        if response.status_code not in [200, 201]:
            # Try global
            print(f"⚠️  Workspace creation failed, trying global...")
            create_url = f"{GEOSERVER_URL}/rest/styles"
            response = requests.post(
                create_url,
                auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
                headers={'Content-Type': 'application/json'},
                json=style_json
            )
        
        if response.status_code in [200, 201]:
            print(f"✅ Style entry created, uploading SLD...")
            
            # Upload SLD - try workspace first
            sld_url = f"{GEOSERVER_URL}/rest/workspaces/{workspace}/styles/{style_name}"
            response = requests.put(
                sld_url,
                auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
                headers={'Content-Type': 'application/vnd.ogc.sld+xml'},
                data=sld_content.encode('utf-8')
            )
            
            if response.status_code != 200:
                # Try global
                sld_url = f"{GEOSERVER_URL}/rest/styles/{style_name}"
                response = requests.put(
                    sld_url,
                    auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
                    headers={'Content-Type': 'application/vnd.ogc.sld+xml'},
                    data=sld_content.encode('utf-8')
                )
            
            if response.status_code == 200:
                print(f"✅ SLD uploaded successfully!")
                return True
            else:
                print(f"❌ Failed to upload SLD: {response.status_code} - {response.text}")
                return False
        else:
            print(f"❌ Failed to create style entry: {response.status_code} - {response.text}")
            return False

def apply_style_to_layer(layer_name: str, style_name: str):
    """Apply style to a specific layer"""
    
    workspace = 'macau'
    
    print(f"\n📍 Applying style '{style_name}' to layer '{layer_name}'...")
    
    # Set as default style
    url = f"{GEOSERVER_URL}/rest/layers/{workspace}:{layer_name}"
    layer_config = {
        "layer": {
            "defaultStyle": {
                "name": style_name,
                "workspace": workspace
            }
        }
    }
    
    response = requests.put(
        url,
        auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
        headers={'Content-Type': 'application/json'},
        json=layer_config
    )
    
    if response.status_code == 200:
        print(f"✅ Style '{style_name}' applied to '{layer_name}'")
        return True
    else:
        # Try without workspace prefix in style
        layer_config["layer"]["defaultStyle"] = {"name": style_name}
        response = requests.put(
            url,
            auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
            headers={'Content-Type': 'application/json'},
            json=layer_config
        )
        if response.status_code == 200:
            print(f"✅ Style '{style_name}' applied to '{layer_name}' (global style)")
            return True
        else:
            print(f"❌ Failed to apply style to '{layer_name}': {response.status_code} - {response.text}")
            return False

def main():
    print("=" * 60)
    print("🎨 Macau Boundary Style Configuration")
    print("=" * 60)
    print(f"GeoServer URL: {GEOSERVER_URL}")
    print("Styles to create:")
    print("  - macau_boundary_red   (Red #E53935) - for Districts")
    print("  - macau_boundary_purple (Purple #9575CD) - for Statistical Areas")
    print("=" * 60)
    
    print("\n📝 Step 1: Creating Red Boundary Style...")
    create_style('macau_boundary_red', MACAU_BOUNDARY_RED_SLD)
    
    print("\n📝 Step 2: Creating Purple Boundary Style...")
    create_style('macau_boundary_purple', MACAU_BOUNDARY_PURPLE_SLD)
    
    print("\n📝 Step 3: Applying Styles to Layers...")
    apply_style_to_layer('macau_district_boundary_polyline', 'macau_boundary_red')
    apply_style_to_layer('macau_statistical_area_polyline', 'macau_boundary_purple')
    
    print("\n" + "=" * 60)
    print("✅ Configuration Complete!")
    print("=" * 60)
    print("\n💡 Notes:")
    print("   - District Boundaries → Red (#E53935)")
    print("   - Statistical Area Boundaries → Purple (#9575CD)")
    print("   - Refresh your browser to see changes")
    print("\n📋 If styles don't appear, manually create in GeoServer:")
    print("   1. Go to: Styles > Add a new style")
    print("   2. Name: macau_boundary_red / macau_boundary_purple")
    print("   3. Workspace: macau")
    print("   4. Format: SLD")
    print("   5. Copy the SLD content below")

if __name__ == '__main__':
    main()
