# GeoServer Layer Availability Report
**Generated:** December 1, 2025
**Remote GeoServer:** http://143.89.22.7:8090/geoserver/wms
**Total COP Layers:** 1,850
**Total ITF Layers:** 0

## ✅ Available Geospatial Layers

### Geography Category
| Feature Name | GeoServer Layer | Status | Notes |
|--------------|----------------|--------|-------|
| Administrative Boundary | `COP:taiping_boundary` | ✅ Available | Working layer |

### Infrastructure Category
| Feature Name | GeoServer Layer | Status | Notes |
|--------------|----------------|--------|-------|
| Building | `COP:Building` | ✅ Available | **Currently Working** |

### Socioeconomic Category
| Feature Name | GeoServer Layer | Status | Notes |
|--------------|----------------|--------|-------|
| Nighttime Light Index | `COP:ENTLI` | ✅ Available | Can be enabled |

### Weather Category
| Feature Name | GeoServer Layer | Status | Notes |
|--------------|----------------|--------|-------|
| Annual Rainfall | `COP:taiping_Annual_rainfall` | ✅ Available | Can be enabled |
| Earth Map Integration | `COP:hkSAR` | ✅ Available | Satellite imagery |

---

## ❌ Missing Layers (Not Available on GeoServer)

### Geography Category
- ❌ **Topography** - Expected layer names: `COP:Topography`, `ITF:DEM`, etc. → **NOT FOUND**
- ❌ **Geomorphology** - Expected: `COP:Geomorphology` → **NOT FOUND**
- ❌ **River Network** - Expected: `COP:River_Network` → **NOT FOUND**
- ❌ **Land Cover** - Expected: `ITF:LandCover_ProbaV_2019` → **NOT FOUND**

### Infrastructure Category
- ❌ **Roads & Streets** - Expected: `COP:Roads_Streets` → **NOT FOUND**
- ❌ **Land Use** - Expected: `COP:Land_Use` → **NOT FOUND**
- ❌ **Drainage Conduits** - Expected: `ITF:Conduits` → **NOT FOUND**
- ❌ **Drainage Junctions** - Expected: `ITF:Junctions` → **NOT FOUND**
- ❌ **Drainage Outfalls** - Expected: `ITF:Outfalls` → **NOT FOUND**
- ❌ **Defensive Embankments** - Expected: `ITF:Defensive_Embankments` → **NOT FOUND**
- ❌ **Service Reservoirs** - Expected: `ITF:Service_Reservoirs` → **NOT FOUND**

### Socioeconomic Category
- ❌ **Population Density** - Expected: `ITF:PopulationDensity_per_30_arcseconds` → **NOT FOUND**
- ❌ **Economic Data** - Expected: `ITF:Economic_Data` → **NOT FOUND**
- ❌ **Industrial & Commercial** - Expected: `ITF:Industrial_Commercial` → **NOT FOUND**
- ❌ **Points of Interest (POI)** - Expected: `ITF:POI` → **NOT FOUND**

### Weather Category
- ❌ **Annual Temperature** - Expected: `COP:Annual_Temperature` → **NOT FOUND**

---

## 🔍 Analysis Summary

### Why Only Building Works
The code expects infrastructure layers to exist in the `ITF` workspace, but:
1. **NO ITF workspace exists** on the remote GeoServer
2. The GeoServer has **1,850 COP layers**, most of which are time-series data with timestamp patterns
3. Only a handful of COP layers match the desired geospatial features

### Layer Naming Patterns on Server
Most COP layers follow these patterns:

**Time-series Event Data (majority of 1,850 layers):**
```
COP:202309071800_ABExp       # Hourly atmospheric exposure data
COP:202309071800_FExp        # Hourly flood exposure data
COP:202309071800_Rainfall    # Hourly rainfall data
COP:202309071800_LandslideNumber # Hourly landslide counts
```

**General Geospatial Layers (very few):**
```
COP:Building                 # Building footprints ✅
COP:taiping_boundary        # Administrative boundaries ✅
COP:taiping_Annual_rainfall # Annual rainfall climatology ✅
COP:ENTLI                   # Nighttime light index ✅
COP:hkSAR                   # Hong Kong SAR imagery ✅
COP:HKDistrict              # Hong Kong district boundaries
```

---

## 🛠️ Recommendations

### Option 1: Remove Non-Existent Layers from UI
**Recommended approach** - Hide or disable UI checkboxes for layers that don't exist.

**Pros:**
- Clean user experience
- No confusion about missing data
- Prevents console errors

**Implementation:**
- Comment out WMSTileLayer components for missing layers
- Update UI to hide unavailable checkboxes
- Add tooltip: "Layer not available on current GeoServer"

### Option 2: Request Layer Upload to GeoServer
Ask the GeoServer administrator to publish the missing ITF workspace layers:
- ITF:Conduits
- ITF:Junctions
- ITF:Outfalls
- ITF:PopulationDensity_per_30_arcseconds
- ITF:LandCover_ProbaV_2019
- ITF:Service_Reservoirs
- ITF:Defensive_Embankments
- ITF:Economic_Data
- ITF:Industrial_Commercial
- ITF:POI

And missing COP layers:
- COP:Roads_Streets
- COP:Land_Use
- COP:Topography
- COP:Geomorphology
- COP:River_Network
- COP:Annual_Temperature

### Option 3: Use Existing Time-Series Layers
The 1,850 COP layers include rich time-series data for:
- **Rainfall** (hourly from Sept 7-8, 2023)
- **Flood Exposure** (ABExp, FExp)
- **Landslide Counts** (LandslideNumber)

These could be used to create animated time-series visualizations of historical typhoon events.

---

## 📝 Immediate Action Items

1. ✅ **Update UI to show only available layers**
   - Keep: Building, Boundary, Annual Rainfall, Nighttime Light, Earth Map
   - Remove/Disable: All ITF layers, Roads, Land Use, Temperature, etc.

2. ✅ **Add error handling**
   - Already added `eventHandlers` for Building layer
   - Add same for Boundary and Annual Rainfall layers

3. ⏳ **Contact GeoServer Admin**
   - Request upload of missing COP and ITF layers
   - Or obtain correct layer names if they exist under different names

4. ⏳ **Future Enhancement**
   - Consider adding time-series typhoon event layers
   - Example: Animate Sept 2023 typhoon hour-by-hour rainfall

---

## 🎯 Current Status (After Fix)

**Working Layers:**
- ✅ COP:Building (Infrastructure)
- ✅ COP:taiping_boundary (Geography)
- ✅ COP:taiping_Annual_rainfall (Weather)
- ⏳ COP:ENTLI (Socioeconomic) - Available but UI needs enabling
- ⏳ COP:hkSAR (Weather/Imagery) - Available but UI needs enabling

**Not Working (Will be disabled in UI):**
- All ITF workspace layers (workspace doesn't exist)
- Most expected COP layers (don't exist on server)

---

**Next Steps:** Update the RiskMap UI to disable/hide unavailable layers and prevent user confusion.
