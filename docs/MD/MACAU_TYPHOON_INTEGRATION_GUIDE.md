# Macau Typhoon Flood Events Integration Guide

## 📋 Overview

This guide explains how to integrate Macau typhoon flood simulation results (TIF files) and insurance claim data into the NatCat Risk Platform.

## 📦 Data Inventory

### Flood Simulation Data (TIF Format)
Located at: `D:\web-flood-insurance-model\Data\Typhoon_FloodResult_Macau\`

| Event | Area | File Name | Size |
|-------|------|-----------|------|
| **Ragasa (桦加沙)** | Macau Peninsula | `Ragasa_MacauPeninsula.tif` | 4.1 MB |
| | Taipa | `Ragasa_Taipa.tif` | 7.2 MB |
| **Hato (天鸽)** | Macau Peninsula | `Hato_MacauPeninsula.tif` | 4.1 MB |
| | Taipa | `Hato_Taipa.tif` | 7.2 MB |
| **Mangkhut (山竹)** | Macau Peninsula | `Mangkhut_MacauPeninsula.tif` | 15.6 MB |
| | Taipa | `Mangkhut_Taipa.tif` | 7.2 MB |

### Insurance Data (Excel Format)
Located at: `D:\web-flood-insurance-model\Data\Insurance_data\`

- `承保信息.xlsx` (18.7 MB) - Policy/underwriting information
- `理賠信息(巨災).xlsx` (120 KB) - Catastrophe claims data

---

## 🗺️ Step 1: Publish TIF Files as WMS Layers

### 1.1 Using GeoServer

#### Option A: GeoServer Web UI

1. **Login to GeoServer**
   ```
   URL: http://localhost:8080/geoserver
   Default credentials: admin / geoserver
   ```

2. **Create Workspace** (if not exists)
   - Navigate to: `Workspaces` → `Add new workspace`
   - Name: `Macau`
   - Namespace URI: `http://geoserver.org/macau`

3. **Create Store for each TIF file**
   - Navigate to: `Stores` → `Add new Store` → `GeoTIFF`
   - Configure for each file:
     ```
     Workspace: Macau
     Data Source Name: Hato_Peninsula
     Connection Parameters:
       - URL: file:///D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/Hato_MacauPeninsula.tif
     ```
   - Repeat for all 6 TIF files

4. **Publish Layers**
   - After creating store, click "Publish"
   - Layer configuration:
     ```
     Name: Hato_MacauPeninsula
     Title: Typhoon Hato - Macau Peninsula Flood Depth
     Coordinate Reference System: EPSG:4326 (or auto-detect from TIF)
     Bounding Boxes: Compute from data
     ```

5. **Style Configuration**
   - Navigate to: `Styles` → `Add new style`
   - Create flood depth color ramp style:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>Macau Flood Depth</Name>
    <UserStyle>
      <Title>Flood Depth (meters)</Title>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <ColorMap>
              <ColorMapEntry color="#FFFFFF" quantity="0" label="0 m" opacity="0"/>
              <ColorMapEntry color="#C6ECFF" quantity="0.2" label="0.2 m" opacity="0.7"/>
              <ColorMapEntry color="#87CEFA" quantity="0.5" label="0.5 m" opacity="0.8"/>
              <ColorMapEntry color="#4A90E2" quantity="1.0" label="1.0 m" opacity="0.85"/>
              <ColorMapEntry color="#2E5C8A" quantity="2.0" label="2.0 m" opacity="0.9"/>
              <ColorMapEntry color="#1E3A5F" quantity="3.0" label="3.0 m" opacity="0.95"/>
              <ColorMapEntry color="#0D1B2A" quantity="5.0" label="> 5.0 m" opacity="1.0"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

6. **Test WMS Endpoint**
   ```
   http://localhost:8080/geoserver/Macau/wms?
     service=WMS&
     version=1.1.0&
     request=GetMap&
     layers=Macau:Hato_MacauPeninsula&
     bbox=113.52,22.14,113.58,22.22&
     width=768&
     height=768&
     srs=EPSG:4326&
     format=image/png
   ```

#### Option B: Using GDAL Command Line

```bash
# Convert TIF to Cloud Optimized GeoTIFF (COG) for better performance
gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2 \
  D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/Hato_MacauPeninsula.tif \
  D:/geoserver_data/Hato_MacauPeninsula_COG.tif

# Check TIF metadata
gdalinfo D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/Hato_MacauPeninsula.tif
```

### 1.2 Layer Naming Convention

| Event | Area | WMS Layer Name |
|-------|------|----------------|
| Ragasa | Macau Peninsula | `Macau:Ragasa_MacauPeninsula` |
| Ragasa | Taipa | `Macau:Ragasa_Taipa` |
| Hato | Macau Peninsula | `Macau:Hato_MacauPeninsula` |
| Hato | Taipa | `Macau:Hato_Taipa` |
| Mangkhut | Macau Peninsula | `Macau:Mangkhut_MacauPeninsula` |
| Mangkhut | Taipa | `Macau:Mangkhut_Taipa` |

---

## 📊 Step 2: Process Insurance Data

### 2.1 Install Required Python Packages

```bash
pip install pandas openpyxl requests
```

### 2.2 Run Insurance Data Parser

```bash
# Navigate to project directory
cd D:\web-flood-insurance-model\flood-catastrophe-insurance-system

# Run parser script
python scripts/parse-macau-insurance-data.py
```

**What the script does:**
1. Reads `承保信息.xlsx` and `理賠信息(巨災).xlsx`
2. Extracts policy addresses, claim amounts, policy IDs
3. Geocodes addresses using **Macau GIS API** (地籍局 API)
4. Outputs:
   - `public/data/macau-insurance-policies.geojson` (geocoded policies with claims)
   - `public/data/macau-event-summary.json` (event-level statistics)

### 2.3 Expected Output Format

**macau-insurance-policies.geojson:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [113.5439, 22.1987]
      },
      "properties": {
        "policyId": "MO-2017-12345",
        "address": "澳门半岛新口岸区",
        "insuredAmount": 5000000,
        "totalClaimAmount": 1200000,
        "claimsCount": 1,
        "lossRatio": 0.24,
        "eventName": "Hato"
      }
    }
  ]
}
```

**macau-event-summary.json:**
```json
{
  "Hato": {
    "totalClaims": 1250,
    "totalClaimAmount": 1650000000,
    "avgClaimAmount": 1320000,
    "maxClaimAmount": 45000000
  },
  "Mangkhut": {
    "totalClaims": 2100,
    "totalClaimAmount": 2830000000,
    "avgClaimAmount": 1347619,
    "maxClaimAmount": 62000000
  },
  "Ragasa": {
    "totalClaims": 850,
    "totalClaimAmount": 950000000,
    "avgClaimAmount": 1117647,
    "maxClaimAmount": 38000000
  }
}
```

---

## 🖥️ Step 3: Update Risk Map Frontend

### 3.1 Load Macau Event Data

Update `src/app/riskmap/page.tsx`:

```typescript
// Import Macau typhoon events
import macauTyphoonEvents from '@/../public/data/macau-typhoon-events.json';

// Load insurance policies GeoJSON
const [macauInsurancePolicies, setMacauInsurancePolicies] = useState<any>(null);

useEffect(() => {
  fetch('/data/macau-insurance-policies.geojson')
    .then(res => res.json())
    .then(data => setMacauInsurancePolicies(data))
    .catch(err => console.error('Failed to load Macau insurance data:', err));
}, []);
```

### 3.2 Add Macau Events to Historical Events List

```typescript
// Merge with existing historical events
const [historicalEvents, setHistoricalEvents] = useState([
  ...mockHistoricalEvents,
  ...macauTyphoonEvents
]);
```

### 3.3 Add WMS Layer Controls for TIF Files

```typescript
// Add to visibleLayers state
const [visibleLayers, setVisibleLayers] = useState({
  // ... existing layers ...
  
  // Macau Typhoon Flood Layers
  macauHatoPeninsula: false,
  macauHatoTaipa: false,
  macauMangkhutPeninsula: false,
  macauMangkhutTaipa: false,
  macauRagasaPeninsula: false,
  macauRagasaTaipa: false,
});

// Add WMS layer configuration
const macauWmsLayers = {
  macauHatoPeninsula: { name: 'Hato - Macau Peninsula', layer: 'Macau:Hato_MacauPeninsula' },
  macauHatoTaipa: { name: 'Hato - Taipa', layer: 'Macau:Hato_Taipa' },
  macauMangkhutPeninsula: { name: 'Mangkhut - Macau Peninsula', layer: 'Macau:Mangkhut_MacauPeninsula' },
  macauMangkhutTaipa: { name: 'Mangkhut - Taipa', layer: 'Macau:Mangkhut_Taipa' },
  macauRagasaPeninsula: { name: 'Ragasa - Macau Peninsula', layer: 'Macau:Ragasa_MacauPeninsula' },
  macauRagasaTaipa: { name: 'Ragasa - Taipa', layer: 'Macau:Ragasa_Taipa' },
};
```

### 3.4 Render WMS Layers on Map

```tsx
{/* Macau Typhoon Flood Layers */}
{Object.entries(macauWmsLayers).map(([key, config]) => 
  visibleLayers[key] && (
    <WMSTileLayer
      key={key}
      url="http://localhost:8080/geoserver/Macau/wms"
      layers={config.layer}
      format="image/png"
      transparent={true}
      version="1.1.0"
      opacity={0.7}
    />
  )
)}
```

### 3.5 Display Insurance Policy Markers

```tsx
{/* Insurance Policy Markers */}
{macauInsurancePolicies && macauInsurancePolicies.features.map((feature: any, idx: number) => {
  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties;
  
  // Color based on loss ratio
  const markerColor = props.lossRatio > 0.5 ? '#dc2626' : // High loss (red)
                      props.lossRatio > 0.3 ? '#f59e0b' : // Medium loss (amber)
                      '#10b981'; // Low loss (green)
  
  return (
    <Marker
      key={`policy-${idx}`}
      position={[lat, lng]}
      icon={L.divIcon({
        className: 'insurance-marker',
        html: `<div style="
          width: 12px;
          height: 12px;
          background: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      })}
    >
      <Popup>
        <div className="p-2">
          <p className="font-bold text-sm">{props.policyId}</p>
          <p className="text-xs text-gray-600">{props.address}</p>
          <Separator className="my-2" />
          <div className="text-xs space-y-1">
            <p><strong>保额:</strong> ${(props.insuredAmount / 1000).toFixed(0)}K</p>
            <p><strong>赔付:</strong> ${(props.totalClaimAmount / 1000).toFixed(0)}K</p>
            <p><strong>赔付率:</strong> {(props.lossRatio * 100).toFixed(1)}%</p>
            <p><strong>理赔次数:</strong> {props.claimsCount}</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
})}
```

### 3.6 Add Event Details Card with Insurance Summary

```tsx
{selectedEvent && selectedEvent.id.startsWith('TY') && (
  <Card className="mt-4">
    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardTitle className="text-sm">📊 Insurance Impact Summary</CardTitle>
    </CardHeader>
    <CardContent className="pt-4">
      {selectedEvent.insuranceData && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Claims:</span>
            <span className="font-semibold">{selectedEvent.insuranceData.claimsCount || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Paid:</span>
            <span className="font-semibold text-red-600">
              ${((selectedEvent.insuranceData.totalClaimAmount || 0) / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Claim:</span>
            <span className="font-semibold">
              ${((selectedEvent.insuranceData.totalClaimAmount || 0) / (selectedEvent.insuranceData.claimsCount || 1) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      )}
      
      <Separator className="my-3" />
      
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Available Flood Layers:</p>
        {selectedEvent.floodSimulation?.availableLayers.map((layer: any, idx: number) => (
          <div key={idx} className="flex items-center">
            <Checkbox
              id={`flood-layer-${idx}`}
              checked={visibleLayers[layer.wmsLayer.replace(':', '').replace('Macau', 'macau')]}
              onCheckedChange={(checked) => {
                const layerKey = layer.wmsLayer.replace(':', '').replace('Macau', 'macau');
                setVisibleLayers(prev => ({ ...prev, [layerKey]: !!checked }));
              }}
            />
            <Label htmlFor={`flood-layer-${idx}`} className="ml-2 text-xs cursor-pointer">
              {layer.name}
            </Label>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## 🧪 Step 4: Testing

### 4.1 Test WMS Layers

1. Open Risk Map page: `http://localhost:3003/riskmap`
2. Navigate to Macau (22.1987, 113.5439)
3. Open "Geospatial & Disaster Data Hub"
4. Toggle Macau typhoon flood layers
5. Verify TIF layers display correctly with color ramp

### 4.2 Test Historical Events

1. Open "Historical Events" section
2. Filter by "Typhoon" type
3. Verify 3 Macau events appear:
   - Typhoon Hato (天鸽) - 2017-08-23
   - Typhoon Mangkhut (山竹) - 2018-09-16
   - Typhoon Ragasa (桦加沙) - 2023-09-02
4. Click on each event to view details

### 4.3 Test Insurance Data Display

1. Select a Macau typhoon event
2. Verify insurance summary card appears
3. Check policy markers on map
4. Click policy markers to view claim details
5. Verify color coding by loss ratio

---

## 📝 Step 5: Documentation & Maintenance

### 5.1 Update Event Metadata

After running insurance parser, update `macau-typhoon-events.json` with actual insurance statistics:

```json
{
  "insuranceData": {
    "totalPolicies": 15240,
    "claimsCount": 1250,
    "totalClaimAmount": 1650000000,
    "dataSource": "TPRe Macau Insurance Data"
  }
}
```

### 5.2 Performance Optimization

For large TIF files (> 10 MB):

1. **Convert to Cloud Optimized GeoTIFF (COG)**
   ```bash
   gdal_translate -of COG -co COMPRESS=DEFLATE \
     input.tif output_COG.tif
   ```

2. **Generate Overviews (Pyramids)**
   ```bash
   gdaladdo -r average output_COG.tif 2 4 8 16 32
   ```

3. **Tile Cache in GeoServer**
   - Install GeoWebCache
   - Configure tile layers for each TIF
   - Use seeding for frequently accessed zoom levels

---

## 🎯 Summary Checklist

- [ ] All 6 TIF files published as WMS layers in GeoServer
- [ ] WMS layers accessible via test GetMap requests
- [ ] Insurance Excel files parsed successfully
- [ ] GeoJSON output generated with geocoded policies
- [ ] Event summary JSON created
- [ ] Risk Map frontend updated with Macau events
- [ ] WMS layers rendering correctly on map
- [ ] Insurance policy markers displaying
- [ ] Event details showing insurance statistics
- [ ] Performance optimizations applied (COG, caching)

---

## 🔧 Troubleshooting

### Issue: TIF files not displaying

**Solution:**
1. Check GeoServer logs: `{GEOSERVER_HOME}/logs/geoserver.log`
2. Verify CRS: Use `gdalinfo` to check coordinate system
3. Test GetCapabilities: `http://localhost:8080/geoserver/Macau/wms?service=WMS&request=GetCapabilities`

### Issue: Geocoding API not working

**Solution:**
1. Check internet connection (Macau GIS API requires online access)
2. Verify API endpoints are accessible
3. Try manual test:
   ```bash
   curl "https://api.gis.gov.mo/dataservice/findResults?word=澳门半岛&lang=zh-CN&limit=1"
   ```

### Issue: Insurance data columns not matching

**Solution:**
1. Open Excel files and check actual column names
2. Update `parse-macau-insurance-data.py` line 75-85 with correct column names
3. Re-run the script

---

## 📚 References

- [GeoServer Documentation](http://docs.geoserver.org/)
- [GDAL TIF Processing](https://gdal.org/drivers/raster/gtiff.html)
- [Macau GIS API](https://api.gis.gov.mo) (地籍局API)
- [React-Leaflet WMS](https://react-leaflet.js.org/)

---

**Last Updated:** 2025-11-18  
**Version:** 1.0
