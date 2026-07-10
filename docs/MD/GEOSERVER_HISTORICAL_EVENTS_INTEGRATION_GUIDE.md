# GeoServer Historical Events Integration Guide

## Overview

This guide explains how to integrate your GeoServer TIFF and Shapefile data with the Natural Catastrophe Risk Platform's Historical Events feature in the Risk Map module.

## Integration Architecture

### Data Flow
```
Historical Event → GeoServer Layers (TIFF/Shapefile) → WMS Service → Leaflet Map
```

### Components Modified

1. **Data Structure** (`public/data/historical-events-with-layers.json`)
   - Extended historical events with GeoServer layer references
   - Each event can have multiple associated data layers

2. **State Management** (`src/app/riskmap/page.tsx`)
   - `visibleEventLayers`: Tracks which event layers are currently visible
   - `handleEventSelection`: Auto-enables the first layer when an event is selected
   - `toggleEventLayer`: Toggles individual layer visibility

3. **UI Components**
   - Event list with layer checkboxes
   - Layer metadata display (name, description, type, format)
   - Dynamic layer toggling

4. **Map Rendering**
   - WMS tile layers loaded from GeoServer
   - Layers rendered with transparency (70% opacity)
   - Support for both raster (TIFF) and vector (Shapefile) data

## Data Structure

### Historical Event with GeoServer Layers

```json
{
  "id": "TY2023-001",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "region": "Hong Kong",
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "affectedAreas": ["Hong Kong", "Guangdong", "Macau"],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "geoserverLayers": [
    {
      "id": "mangkhut_flood_depth",
      "name": "Flood Depth - Typhoon Mangkhut",
      "workspace": "historical_events",
      "layerName": "typhoon_mangkhut_flood_depth",
      "type": "raster",
      "format": "image/png",
      "description": "Simulated flood depth during Typhoon Mangkhut"
    }
  ]
}
```

### Layer Object Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique identifier for the layer | `"mangkhut_flood_depth"` |
| `name` | string | Display name shown in UI | `"Flood Depth - Typhoon Mangkhut"` |
| `workspace` | string | GeoServer workspace name | `"historical_events"` |
| `layerName` | string | Layer name in GeoServer | `"typhoon_mangkhut_flood_depth"` |
| `type` | string | Data type: "raster" or "vector" | `"raster"` |
| `format` | string | WMS output format | `"image/png"` |
| `description` | string | Detailed description of the layer | `"Simulated flood depth..."` |

## Step-by-Step Setup Guide

### Step 1: Publish Data to GeoServer

1. **Create a Workspace** (if not exists)
   ```
   Workspace Name: historical_events
   Namespace URI: http://your-domain.com/historical_events
   ```

2. **Publish TIFF Raster Data**
   - Go to: **Stores → Add new Store → GeoTIFF**
   - Choose your TIFF file
   - Publish as layer with name: `typhoon_mangkhut_flood_depth`

3. **Publish Shapefile Vector Data**
   - Go to: **Stores → Add new Store → Shapefile**
   - Choose your .shp file
   - Publish as layer with name: `typhoon_mangkhut_affected_areas`

4. **Configure Layer Settings**
   - Set proper SRS/CRS (e.g., EPSG:4326 or EPSG:3857)
   - Configure styles for visualization
   - Enable WMS service

### Step 2: Add Event to Data File

Edit `public/data/historical-events-with-layers.json` and add your event:

```json
{
  "id": "YOUR_EVENT_ID",
  "name": "Your Event Name",
  "type": "Typhoon|Flood|Rainstorm|etc",
  "date": "YYYY-MM-DD",
  "year": YYYY,
  "region": "Your Region",
  "maxWindSpeed": "XXX km/h",
  "totalRainfall": "XXX mm",
  "estimatedLoss": "$X.XX Billion",
  "affectedPopulation": "X.X Million",
  "affectedAreas": ["Area1", "Area2"],
  "geometry": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "geoserverLayers": [
    {
      "id": "unique_layer_id",
      "name": "Display Name for Layer",
      "workspace": "historical_events",
      "layerName": "your_geoserver_layer_name",
      "type": "raster",
      "format": "image/png",
      "description": "Description of what this layer shows"
    }
  ]
}
```

### Step 3: Update GeoServer URL (if different)

If your GeoServer is hosted at a different URL, update the WMS endpoint in `src/app/riskmap/page.tsx`:

```typescript
// Find this section (around line 2960):
<WMSTileLayer
  key={layer.id}
  url="http://143.89.22.7:8090/geoserver/wms"  // <-- Update this URL
  layers={layerFullName}
  format={layer.format}
  transparent={true}
  version="1.1.0"
  opacity={0.7}
/>
```

### Step 4: Test the Integration

1. Navigate to **Risk Map** module
2. Open **Geospatial & Disaster Data Hub**
3. Click on **Disaster Events**
4. Select **Historical Events**
5. Click on an event from the list
6. Check the **Available Data Layers** section
7. Toggle checkboxes to show/hide layers on the map

## Usage Instructions

### For End Users

1. **Select an Event**
   - Click on a historical event in the list
   - The map will fly to the event location
   - The first data layer will automatically be enabled

2. **Toggle Layers**
   - Each event shows its available data layers
   - Check/uncheck boxes to show/hide layers
   - Multiple layers can be displayed simultaneously

3. **View Layer Information**
   - Hover over layer names to see descriptions
   - Layer type (raster/vector) and format are displayed
   - Layers are rendered with 70% opacity for clarity

### For Administrators

#### Adding New Events

1. Prepare your spatial data (TIFF or Shapefile)
2. Publish to GeoServer following Step 1 above
3. Add event entry to `historical-events-with-layers.json`
4. Reload the application

#### Updating Existing Events

1. Add new layers to GeoServer
2. Update the event's `geoserverLayers` array in JSON
3. No code changes required

#### Removing Events/Layers

1. Remove layer object from `geoserverLayers` array, or
2. Remove entire event object from JSON file

## Technical Details

### WMS Layer Rendering

```typescript
// Layers are constructed using workspace:layerName format
const layerFullName = `${layer.workspace}:${layer.layerName}`;

// Example: "historical_events:typhoon_mangkhut_flood_depth"
```

### State Management

```typescript
// Layer visibility is tracked in a dictionary
const [visibleEventLayers, setVisibleEventLayers] = useState<Record<string, boolean>>({});

// Example state:
// {
//   "mangkhut_flood_depth": true,
//   "mangkhut_wind_field": false,
//   "mangkhut_affected_areas": true
// }
```

### Event Selection Flow

1. User clicks event → `handleEventSelection(event)` called
2. Map flies to event coordinates
3. First GeoServer layer automatically enabled
4. Layer checkboxes become available in UI
5. User can toggle additional layers

## Supported Data Types

### Raster Data (TIFF)
- Flood depth grids
- Rainfall distribution
- Wind field data
- Temperature data
- Any georeferenced raster

### Vector Data (Shapefile)
- Affected area polygons
- Evacuation routes (lines)
- Shelter locations (points)
- Administrative boundaries
- Infrastructure damage points

## GeoServer Configuration Tips

### Performance Optimization

1. **Create Image Pyramids** for large TIFF files
   ```
   gdal_retile.py -v -r bilinear -levels 4 -ps 2048 2048 -co "TILED=YES" -targetDir tiles input.tif
   ```

2. **Enable Tile Caching**
   - Use GeoWebCache for frequently accessed layers
   - Configure disk-based caching

3. **Optimize Styles**
   - Use simple SLD styles for faster rendering
   - Minimize the number of style rules

### Security Considerations

1. **CORS Configuration**
   - Ensure GeoServer allows requests from your domain
   - Configure in `web.xml`:
   ```xml
   <filter>
     <filter-name>cross-origin</filter-name>
     <filter-class>org.apache.catalina.filters.CorsFilter</filter-class>
     <init-param>
       <param-name>cors.allowed.origins</param-name>
       <param-value>http://localhost:3003,http://10.253.22.15:3003</param-value>
     </init-param>
   </filter>
   ```

2. **Layer Security**
   - Use GeoServer's role-based access control
   - Restrict sensitive layers to authorized users only

## Troubleshooting

### Layer Not Displaying

1. **Check GeoServer Connection**
   ```bash
   curl "http://143.89.22.7:8090/geoserver/wms?service=WMS&version=1.1.0&request=GetCapabilities"
   ```

2. **Verify Layer Name**
   - Ensure `workspace:layerName` matches GeoServer exactly
   - Check for case sensitivity

3. **Check Browser Console**
   - Look for CORS errors
   - Verify WMS request URLs

### Layer Loads Slowly

1. Enable GeoWebCache
2. Reduce TIFF file size:
   ```bash
   gdal_translate -co "COMPRESS=JPEG" -co "TILED=YES" input.tif output.tif
   ```
3. Use appropriate zoom levels

### Styling Issues

1. Configure SLD styles in GeoServer
2. Use color ramps appropriate for your data
3. Set transparency in layer properties

## Example Events

The system comes pre-configured with three example events:

1. **Typhoon Mangkhut (2023)**
   - Flood depth raster
   - Wind field raster
   - Affected areas vector

2. **June 2022 Rainstorm**
   - Rainfall distribution raster
   - Flood extent vector

3. **July 2021 Flash Flood**
   - Flood depth raster
   - Drainage system status vector

## Future Enhancements

Planned improvements:

1. **Dynamic layer discovery** from GeoServer GetCapabilities
2. **Time-series animation** for temporal data
3. **Layer opacity controls** per layer
4. **Legend display** for each layer
5. **GetFeatureInfo** popup on click
6. **Download original data** option
7. **Layer reordering** (z-index control)

## Support

For questions or issues:
- Check GeoServer logs: `/var/log/geoserver/`
- Check browser console for client-side errors
- Verify JSON syntax in data files
- Test WMS endpoints directly

## Summary

This integration provides a flexible, data-driven approach to displaying historical disaster event data:
- **No code changes** needed to add new events
- **Multiple data layers** per event supported
- **Both raster and vector** data types supported
- **Dynamic layer toggling** for interactive exploration
- **Scalable** architecture for large datasets

The system is ready to integrate your GeoServer TIFF and Shapefile data for historical typhoon, flood, and other disaster events!
