# GeoServer Upload Guide
**Multi-Level Geographic Statistics - Layer Upload Instructions**

## Overview
This guide provides step-by-step instructions for uploading the three geographic layers to GeoServer for the Portfolio Management multi-level statistics feature.

**GeoServer URL**: http://143.89.22.7:8090/geoserver/web/

---

## Files to Upload

All files are located in: `D:\Nat Cat Platform\Data\Shapefile\GeoServer_Upload\`

| File | Size | Features | Description |
|------|------|----------|-------------|
| `HK_Districts_18.geojson` | 3.8 MB | 18 | Hong Kong 18 Administrative Districts (filled polygons) |
| `HK_Districts_18_Lines.geojson` | 3.3 MB | 18 | Hong Kong 18 Districts boundaries (lines only) |
| `HK_TPU_292.geojson` | 18 MB | 292 | Tertiary Planning Units (simplified from 4,916 subunits) |

---

## Pre-Upload Checklist

- [ ] GeoServer is accessible at http://143.89.22.7:8090/geoserver/web/
- [ ] You have admin credentials
- [ ] All three GeoJSON files are in the `GeoServer_Upload` directory
- [ ] Files are valid GeoJSON (they are - already validated)

---

## Step 1: Login to GeoServer

1. Navigate to: http://143.89.22.7:8090/geoserver/web/
2. Click **Login** in the top right
3. Enter your admin credentials
4. You should see the GeoServer Web Administration Interface

---

## Step 2: Create Workspace (if not exists)

### Check if `natcat` workspace exists:
1. Click **Workspaces** in the left sidebar under "Data"
2. Look for workspace named `natcat`

### If workspace doesn't exist, create it:
1. Click **Add new workspace**
2. Fill in:
   - **Name**: `natcat`
   - **Namespace URI**: `http://natcat.platform/geoserver`
   - **Default Workspace**: ☑ (check this box)
3. Click **Save**

---

## Step 3: Upload Layer 1 - 18 Districts (Filled)

### 3.1 Create Data Store

1. Click **Stores** in left sidebar → **Add new Store**
2. Under **Vector Data Sources**, click **GeoJSON**
3. Fill in:
   - **Workspace**: Select `natcat`
   - **Data Source Name**: `hk_districts_18_store`
   - **Description**: "Hong Kong 18 Administrative Districts"
   - **Enabled**: ☑ (checked)
4. Under **Connection Parameters**:
   - **GeoJSON file location**: Browse and select `HK_Districts_18.geojson`
     - Full path: `D:\Nat Cat Platform\Data\Shapefile\GeoServer_Upload\HK_Districts_18.geojson`
5. Click **Save**

### 3.2 Publish Layer

1. After saving, you'll see "New Layer" page
2. Click **Publish** next to the available layer
3. Fill in the **Data** tab:
   - **Name**: `hk_districts_18` (auto-filled)
   - **Title**: `Hong Kong 18 Districts`
   - **Abstract**: "Hong Kong 18 administrative districts with statistical data"
4. Scroll to **Bounding Boxes** section:
   - Click **Compute from data**
   - Click **Compute from native bounds**
5. Go to **Publishing** tab:
   - **Default Style**: Select `polygon` or `simple_polygon`
6. Click **Save**

---

## Step 4: Upload Layer 2 - 18 Districts (Lines)

### 4.1 Create Data Store

1. Click **Stores** → **Add new Store** → **GeoJSON**
2. Fill in:
   - **Workspace**: `natcat`
   - **Data Source Name**: `hk_districts_18_lines_store`
   - **Description**: "Hong Kong 18 Districts Boundaries (Lines)"
   - **GeoJSON file location**: `D:\Nat Cat Platform\Data\Shapefile\GeoServer_Upload\HK_Districts_18_Lines.geojson`
3. Click **Save**

### 4.2 Publish Layer

1. Click **Publish**
2. Fill in:
   - **Name**: `hk_districts_18_lines`
   - **Title**: `Hong Kong 18 Districts Boundaries`
   - **Abstract**: "Boundary lines for 18 administrative districts"
3. **Bounding Boxes**: Compute from data
4. **Publishing** tab:
   - **Default Style**: Select `line` or `simple_line`
5. Click **Save**

---

## Step 5: Upload Layer 3 - TPU 292

### 5.1 Create Data Store

1. Click **Stores** → **Add new Store** → **GeoJSON**
2. Fill in:
   - **Workspace**: `natcat`
   - **Data Source Name**: `hk_tpu_292_store`
   - **Description**: "Hong Kong Tertiary Planning Units (292 regions)"
   - **GeoJSON file location**: `D:\Nat Cat Platform\Data\Shapefile\GeoServer_Upload\HK_TPU_292.geojson`
3. Click **Save**

### 5.2 Publish Layer

1. Click **Publish**
2. Fill in:
   - **Name**: `hk_tpu_292`
   - **Title**: `Hong Kong TPU (292 Regions)`
   - **Abstract**: "Tertiary Planning Units - finest administrative level for statistics"
3. **Bounding Boxes**: Compute from data
4. **Publishing** tab:
   - **Default Style**: Select `polygon`
5. Click **Save**

---

## Step 6: Configure Styles (Optional but Recommended)

### Create Custom Style for Districts

1. Click **Styles** in left sidebar
2. Click **Add a new style**
3. Fill in:
   - **Workspace**: `natcat`
   - **Name**: `districts_style`
   - **Format**: SLD
4. Copy this SLD code:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer>
    <Name>Hong Kong Districts</Name>
    <UserStyle>
      <Title>Districts Style</Title>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3B82F6</CssParameter>
              <CssParameter name="fill-opacity">0.3</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#1E40AF</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

5. Click **Validate** to check syntax
6. Click **Save**

### Create Style for TPU

1. Click **Add a new style** again
2. Fill in:
   - **Workspace**: `natcat`
   - **Name**: `tpu_style`
   - **Format**: SLD
3. Copy this SLD code:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer>
    <Name>TPU Style</Name>
    <UserStyle>
      <Title>TPU Style</Title>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#10B981</CssParameter>
              <CssParameter name="fill-opacity">0.2</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#059669</CssParameter>
              <CssParameter name="stroke-width">1</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

4. Click **Validate** and **Save**

### Apply Custom Styles

1. Go to **Layers** in left sidebar
2. Click on `hk_districts_18`
3. Go to **Publishing** tab
4. Change **Default Style** to `districts_style`
5. Click **Save**
6. Repeat for `hk_tpu_292` with `tpu_style`

---

## Step 7: Verify Layers

### Test in Layer Preview

1. Click **Layer Preview** in left sidebar
2. Find your layers:
   - `natcat:hk_districts_18`
   - `natcat:hk_districts_18_lines`
   - `natcat:hk_tpu_292`
3. For each layer, click **OpenLayers** in the dropdown
4. Verify the layer displays correctly:
   - All 18 districts should be visible (for districts layers)
   - All 292 TPU regions should be visible (for TPU layer)
   - Zoom in/out to test rendering

### Get WMS Endpoints

After publishing, your WMS endpoints will be:

```
Base WMS URL: http://143.89.22.7:8090/geoserver/natcat/wms

Layer Names:
- natcat:hk_districts_18
- natcat:hk_districts_18_lines
- natcat:hk_tpu_292
```

**Example WMS GetMap Request**:
```
http://143.89.22.7:8090/geoserver/natcat/wms?
  service=WMS
  &version=1.1.0
  &request=GetMap
  &layers=natcat:hk_districts_18
  &bbox=113.8,22.1,114.5,22.6
  &width=768
  &height=768
  &srs=EPSG:4326
  &format=image/png
  &transparent=true
```

---

## Step 8: Integration with Portfolio Map

### WMS Layer Configuration

Add these configurations to your `PortfolioMap.tsx`:

```typescript
// WMS Base URL
const WMS_BASE_URL = 'http://143.89.22.7:8090/geoserver/natcat/wms';

// Layer definitions
const geoserverLayers = {
  districts18: {
    name: 'natcat:hk_districts_18',
    title: '18 Districts',
  },
  districts18Lines: {
    name: 'natcat:hk_districts_18_lines',
    title: '18 Districts Boundaries',
  },
  tpu292: {
    name: 'natcat:hk_tpu_292',
    title: 'TPU (292 Regions)',
  }
};

// WMSTileLayer component (react-leaflet)
<WMSTileLayer
  url={WMS_BASE_URL}
  layers="natcat:hk_districts_18"
  format="image/png"
  transparent={true}
  version="1.1.0"
  attribution="GeoServer - Nat Cat Platform"
/>
```

---

## Troubleshooting

### Issue: "File not found" error
**Solution**:
- Verify the file path is correct
- Use forward slashes `/` in path, not backslashes `\`
- Try copying files to GeoServer's data directory: `GEOSERVER_DATA_DIR/data/`

### Issue: Layer doesn't display
**Solution**:
- Check bounding box is computed correctly
- Verify coordinate system is EPSG:4326 (WGS84)
- Check GeoServer logs: `GEOSERVER_HOME/logs/geoserver.log`

### Issue: Performance issues with TPU layer
**Solution**:
- The 18 MB TPU file may be slow to render
- Consider creating pyramid tiles for faster rendering
- Or use vector tiles (GeoJSON tiles) for client-side rendering

### Issue: CORS errors in web application
**Solution**:
Add CORS configuration to GeoServer:
1. Edit `GEOSERVER_DATA_DIR/global.xml`
2. Add CORS filter or use proxy in Next.js app

---

## Next Steps After Upload

1. **Test WMS Endpoints**: Use tools like QGIS or browser to verify WMS URLs
2. **Integrate into Portfolio Map**:
   - Add layer switcher UI
   - Implement WMSTileLayer components
   - Add click interactions to show statistics
3. **Add PPU and SPU layers** (future):
   - Currently only 18 Districts and TPU are prepared
   - Can create PPU (9) and SPU (52) layers later

---

## Statistics Integration

### Linking Map Click to Statistics

When a user clicks on a district or TPU on the map:

1. Use GeoServer WFS GetFeature to identify the clicked region:
```
http://143.89.22.7:8090/geoserver/natcat/wfs?
  service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=natcat:hk_districts_18
  &outputFormat=application/json
  &cql_filter=INTERSECTS(the_geom,POINT(114.15 22.28))
```

2. Extract the district ID or TPU number from the response
3. Load corresponding statistics from `/data/statistics/` JSON files
4. Display in popup or side panel

---

## File Structure Summary

```
GeoServer Structure:
└── natcat (workspace)
    ├── hk_districts_18_store (data store)
    │   └── hk_districts_18 (layer)
    ├── hk_districts_18_lines_store (data store)
    │   └── hk_districts_18_lines (layer)
    └── hk_tpu_292_store (data store)
        └── hk_tpu_292 (layer)

Local Files:
D:\Nat Cat Platform\Data\Shapefile\GeoServer_Upload\
├── HK_Districts_18.geojson (3.8 MB)
├── HK_Districts_18_Lines.geojson (3.3 MB)
└── HK_TPU_292.geojson (18 MB)

Statistics Files:
D:\Nat Cat Platform\UI_system\public\data\statistics\
├── districts-18-statistics.json (345 KB)
├── ppu-statistics.json (309 KB)
├── spu-statistics.json (368 KB)
├── tpu-statistics.json (487 KB)
└── index.json
```

---

## Additional Resources

- **GeoServer Documentation**: https://docs.geoserver.org/
- **WMS Specification**: https://www.ogc.org/standards/wms
- **React-Leaflet WMS**: https://react-leaflet.js.org/docs/api-components/#wmstile layer
- **Multi-Level Statistics Documentation**: `MD/MULTI_LEVEL_STATISTICS_COMPLETE.md`

---

## Completion Checklist

- [ ] All 3 layers uploaded to GeoServer
- [ ] Layers visible in Layer Preview
- [ ] WMS endpoints tested
- [ ] Custom styles applied (optional)
- [ ] CORS configured if needed
- [ ] WMS layers integrated into Portfolio Map
- [ ] Click interaction connects to statistics
- [ ] Performance tested with all layers

---

**Created**: 2024-12-17
**Status**: Ready for upload
**GeoServer Version**: 2.x compatible
**Coordinate System**: EPSG:4326 (WGS84)

---

## Quick Start Commands

Once logged into GeoServer, follow this sequence:

1. Create workspace: `natcat`
2. Upload store 1: `hk_districts_18_store` → Publish `hk_districts_18`
3. Upload store 2: `hk_districts_18_lines_store` → Publish `hk_districts_18_lines`
4. Upload store 3: `hk_tpu_292_store` → Publish `hk_tpu_292`
5. Test in Layer Preview
6. Copy WMS URLs for application integration

**Estimated Time**: 15-20 minutes for all uploads
