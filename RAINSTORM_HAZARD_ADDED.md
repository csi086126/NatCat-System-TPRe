# Rainstorm Hazard Layer Addition

## 📋 Summary
Added **Rainstorm Hazard** module to the Risk Map Hazard Map section, using return period classification (20yr, 50yr, 100yr, 200yr, 500yr) similar to flood hazard layers.

---

## ✅ Changes Made

### 1. Updated State Management
**File**: `src/app/riskmap/page.tsx`

#### Updated `hazardLayers` state:
```typescript
rainstorm: {
  enabled: false,
  '20yr': false,
  '50yr': false,
  '100yr': false,
  '200yr': false,
  '500yr': false,
  opacity: 70,
}
```

#### Added WMS layer configuration:
```typescript
rainstorm500yr: { name: 'Rainstorm intensity (500-year return)', layer: 'COP:Rainstorm_Intensity_500yr' },
rainstorm200yr: { name: 'Rainstorm intensity (200-year return)', layer: 'COP:Rainstorm_Intensity_200yr' },
rainstorm100yr: { name: 'Rainstorm intensity (100-year return)', layer: 'COP:Rainstorm_Intensity_100yr' },
rainstorm50yr: { name: 'Rainstorm intensity (50-year return)', layer: 'COP:Rainstorm_Intensity_50yr' },
rainstorm20yr: { name: 'Rainstorm intensity (20-year return)', layer: 'COP:Rainstorm_Intensity_20yr' },
```

#### Updated `visibleLayers` state:
```typescript
rainstorm500yr: false,
rainstorm200yr: false,
rainstorm100yr: false,
rainstorm50yr: false,
rainstorm20yr: false,
```

---

### 2. Added UI Component
**Location**: Between Flood Hazard and Typhoon Hazard cards in Module 1 (Hazard Map)

**Features**:
- ✅ Master checkbox to enable/disable all rainstorm layers
- ✅ 5 return period checkboxes with rainfall intensity descriptions:
  - **500-year return**: >400mm/day (Extreme rainfall)
  - **200-year return**: 300-400mm/day (Very severe)
  - **100-year return**: 250-300mm/day (Severe)
  - **50-year return**: 200-250mm/day (Heavy)
  - **20-year return**: 150-200mm/day (Moderate)
- ✅ Connected to `visibleLayers` state via `handleLayerToggle()`
- ✅ Consistent styling with other hazard cards (orange theme)

---

## 🎨 UI Structure

```
Module 1: Hazard Map
  ├── Flood Hazard Layers [checkbox]
  │   ├── 500-year return
  │   ├── 200-year return
  │   ├── 100-year return
  │   ├── 50-year return
  │   └── 20-year return
  │
  ├── Rainstorm Hazard Layers [checkbox] ← NEW
  │   ├── 500-year return (>400mm/day) - Extreme rainfall
  │   ├── 200-year return (300-400mm/day) - Very severe
  │   ├── 100-year return (250-300mm/day) - Severe
  │   ├── 50-year return (200-250mm/day) - Heavy
  │   └── 20-year return (150-200mm/day) - Moderate
  │
  └── Typhoon Hazard [checkbox]
      ├── Historical typhoon tracks
      ├── Wind circle coverage
      └── Cumulative rainfall
```

---

## 🔌 Integration Points

### Map Layer Rendering
The rainstorm layers will be rendered through `WMSTileLayer` components when `visibleLayers.rainstorm{period}yr` is `true`:

```tsx
{visibleLayers.rainstorm500yr && (
  <WMSTileLayer
    url="http://143.89.22.7:8090/geoserver/wms"
    layers="COP:Rainstorm_Intensity_500yr"
    format="image/png"
    transparent={true}
    opacity={0.7}
  />
)}
```

### Event Handler
Uses existing `handleLayerToggle()` function:
```typescript
const handleLayerToggle = (layerKey: string) => {
  setVisibleLayers(prev => ({
    ...prev,
    [layerKey]: !prev[layerKey as keyof typeof prev]
  }));
};
```

---

## 📊 Rainfall Intensity Classification

| Return Period | Daily Rainfall (mm) | Severity Level | Risk Description |
|--------------|-------------------|----------------|------------------|
| 20-year | 150-200 | Moderate | Regular heavy rain, minor flooding |
| 50-year | 200-250 | Heavy | Significant rainfall, localized flooding |
| 100-year | 250-300 | Severe | Intense rainfall, widespread flooding |
| 200-year | 300-400 | Very Severe | Extreme rainfall, major flooding |
| 500-year | >400 | Extreme | Catastrophic rainfall, severe flooding |

**Note**: These thresholds are reference values and may vary by region. Adjust based on local meteorological standards.

---

## 🚀 Next Steps

### Required Actions:
1. **GeoServer Configuration**:
   - Create 5 rainstorm intensity raster layers in GeoServer
   - Layer names: `COP:Rainstorm_Intensity_{20/50/100/200/500}yr`
   - Ensure proper styling (color ramp for intensity)

2. **Data Preparation**:
   - Obtain or generate rainstorm return period data
   - Format: GeoTIFF or other raster format
   - Resolution: Match flood layer resolution (e.g., 100m × 100m)
   - Projection: Same as flood layers (likely WGS84 or local projection)

3. **Testing**:
   - Verify checkbox toggles work correctly
   - Test WMS layer visibility on map
   - Check layer rendering performance
   - Validate rainfall intensity values via WMS GetFeatureInfo

### Optional Enhancements:
- Add opacity slider for rainstorm layers
- Add temporal dimension (e.g., historical rainstorm events)
- Include rainstorm duration options (1hr, 6hr, 24hr, 72hr)
- Combine with flood layers for risk analysis

---

## 🔗 Related Files
- `src/app/riskmap/page.tsx` - Main Risk Map component
- `RISKMAP_NEW_DESIGN.md` - Original 4-module design document
- `WMS_EXPLANATION.md` - WMS technology explanation
- `RISKMAP_FUNCTIONAL_DESIGN.md` - Functional requirements

---

## 📝 Technical Notes

### Why Separate Rainstorm from Flood?
1. **Different Hazard Types**:
   - **Flood**: Water inundation depth (physical impact)
   - **Rainstorm**: Precipitation intensity (triggering event)

2. **Independent Risk Assessment**:
   - Rainstorm → Direct rainfall damage (crop loss, erosion)
   - Rainstorm + Terrain → Flood risk
   - Allows separate analysis of rainfall vs. flooding

3. **Reinsurance Applications**:
   - Parametric triggers based on rainfall thresholds
   - Agricultural insurance (crop damage from rain, not flood)
   - Index-based insurance products

### Data Source Recommendations:
- **Historical rainfall data**: National meteorological stations
- **Return period calculation**: Gumbel distribution, GEV (Generalized Extreme Value)
- **Spatial interpolation**: Kriging, IDW (Inverse Distance Weighting)
- **Validation**: Compare with observed extreme rainfall events

---

## ✅ Completion Status
- [x] State management updated
- [x] WMS layer configuration added
- [x] UI component created
- [x] Event handlers connected
- [x] Documentation created
- [ ] GeoServer layers configured (pending data)
- [ ] Map rendering tested (pending layers)
- [ ] WMS GetFeatureInfo tested (pending layers)

---

**Last Updated**: 2025-10-17  
**Author**: AI Assistant  
**Status**: Code complete, awaiting GeoServer layer configuration
