# TPHK Portfolio Geocoding Guide

## Overview

This guide explains how to use the geocoding system to process Taiping Hong Kong (TPHK) insurance portfolio data and convert addresses to geographic coordinates for visualization on maps.

## Features

✅ **Dual API Support**: Google Maps API (primary) + Amap/高德地图 (fallback)
✅ **Automatic Caching**: Avoids duplicate API calls
✅ **Batch Processing**: Handles large datasets efficiently
✅ **Rate Limiting**: Respects API rate limits
✅ **Progress Tracking**: Real-time progress and statistics
✅ **GeoJSON Output**: Ready for frontend visualization

## Prerequisites

### 1. Install Python Dependencies

```bash
pip install pandas openpyxl requests python-dotenv
```

### 2. Get API Keys

#### Google Maps API (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Geocoding API"
4. Create credentials (API Key)
5. Copy your API key

**Free Tier**: $200/month credit (≈28,500 requests)

#### Amap API (Optional Fallback)

1. Register at [Amap Console](https://console.amap.com/)
2. Create application
3. Get Web Service API key

**Free Tier**: 300,000 requests/day

### 3. Configure Environment

Create `.env` file in `UI_system` directory:

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` and add your API keys:

```bash
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AMAP_API_KEY=your_amap_key_here
```

## Usage

### Quick Test (Recommended First Step)

Test the geocoding service with a few sample addresses:

```bash
cd "D:\Nat Cat Platform\UI_system\scripts"
python geocode-tphk-portfolio.py --test
```

Expected output:
```
✓ 8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.
  Coordinates: 22.3612, 114.1234
  Provider: google
```

### Full Portfolio Geocoding

Process all addresses from TPHK Excel files:

```bash
python geocode-tphk-portfolio.py
```

This will:
1. Load policy data (承保信息) and claim data (理赔信息)
2. Extract unique addresses
3. Geocode each address using Google Maps (with Amap fallback)
4. Generate GeoJSON for frontend visualization
5. Create summary report

### Advanced Options

Process specific Excel sheet:

```bash
python geocode-tphk-portfolio.py --sheet "2023-2024"
```

## Output Files

All files are saved to `UI_system/public/data/`:

| File | Description |
|------|-------------|
| `tphk-portfolio.geojson` | GeoJSON for map visualization |
| `tphk-geocoded-portfolio.json` | Raw geocoding results with metadata |
| `tphk-geocoding-cache.json` | Cache file (speeds up re-runs) |
| `TPHK_GEOCODING_REPORT.md` | Summary report with statistics |

## Understanding the Output

### GeoJSON Structure

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.1234, 22.3612]  // [lng, lat]
      },
      "properties": {
        "address": "8/F., HOPEWELL LOGISTICS...",
        "formatted_address": "Hopewell Logistics Centre...",
        "region": "葵青區",
        "source": "policy",
        "provider": "google",
        "building_class": "一類",
        "occupancy": "工廠"
      }
    }
  ],
  "metadata": {
    "total_addresses": 1000,
    "geocoded": 950,
    "success_rate": 95.0
  }
}
```

## Troubleshooting

### API Key Issues

**Error**: `Google Maps API key not configured`

**Solution**: Check your `.env` file contains valid API key

**Test API key**:
```bash
python scripts/geocoding-service.py
```

### Rate Limiting

**Error**: `OVER_QUERY_LIMIT`

**Solution**: Script automatically handles rate limiting, but you can:
- Wait a few minutes and retry
- Use cached results (script will skip already geocoded addresses)

### Failed Geocoding

Some addresses may fail due to:
- Invalid/incomplete address format
- Address not in Google Maps database
- Non-standard abbreviations

**Check failed addresses**:
```bash
# Look in tphk-geocoding.log
grep "Failed to geocode" tphk-geocoding.log
```

## Cost Estimation

### Google Maps Pricing

- **Price**: $5 per 1,000 requests
- **Free tier**: First $200/month free (28,500 requests)
- **TPHK data**: ~1,000-5,000 unique addresses
- **Estimated cost**: $0 (within free tier)

### Optimization Tips

1. **Use cache**: Re-running script uses cached results (free)
2. **Deduplicate**: Script automatically removes duplicate addresses
3. **Monitor usage**: Check [Google Cloud Console](https://console.cloud.google.com/) for usage stats

## Integration with Frontend

### Load GeoJSON in React/Next.js

```typescript
// In your Portfolio Management component
const [portfolioData, setPortfolioData] = useState(null);

useEffect(() => {
  fetch('/data/tphk-portfolio.geojson')
    .then(res => res.json())
    .then(data => setPortfolioData(data));
}, []);
```

### Display on Map (Mapbox GL)

```typescript
import mapboxgl from 'mapbox-gl';

// Add GeoJSON layer
map.addSource('portfolio', {
  type: 'geojson',
  data: '/data/tphk-portfolio.geojson'
});

map.addLayer({
  id: 'portfolio-points',
  type: 'circle',
  source: 'portfolio',
  paint: {
    'circle-radius': 6,
    'circle-color': '#FF6B6B',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
});
```

### Display on Map (Leaflet)

```typescript
import L from 'leaflet';

// Load and display GeoJSON
fetch('/data/tphk-portfolio.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: '#FF6B6B',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <strong>${feature.properties.address}</strong><br/>
          Region: ${feature.properties.region}<br/>
          Occupancy: ${feature.properties.occupancy}
        `);
      }
    }).addTo(map);
  });
```

## Next Steps

After geocoding your portfolio:

1. **Visualize on Map**: Load GeoJSON in your frontend application
2. **Risk Assessment**: Overlay with hazard layers (typhoon tracks, flood zones)
3. **Portfolio Analysis**: Analyze geographic distribution and concentration
4. **Event Impact**: Calculate potential losses for historical events
5. **Exposure Management**: Identify high-risk areas

## API Reference

### GeocodingService Class

```python
from geocoding_service import GeocodingService

# Initialize
service = GeocodingService(
    google_api_key='your_key',
    amap_api_key='your_key',
    cache_file='custom_cache.json'
)

# Single geocoding
result = service.geocode(
    address="8/F., HOPEWELL LOGISTICS CENTRE...",
    region="葵青區"  # Optional region hint
)

# Batch geocoding
results = service.batch_geocode(
    addresses=['addr1', 'addr2', ...],
    regions=['region1', 'region2', ...],  # Optional
    save_interval=10  # Save cache every N addresses
)

# Get statistics
service.print_stats()
```

## Support

### Common Questions

**Q: Can I use only Amap without Google?**
A: Yes, remove Google API key from `.env`, script will use Amap only.

**Q: How do I resume interrupted geocoding?**
A: Just re-run the script. Cached results will be used, only new addresses will be geocoded.

**Q: Can I geocode additional Excel files?**
A: Yes, modify `DATA_DIR` and file paths in `geocode-tphk-portfolio.py`.

### Logs

Check `tphk-geocoding.log` for detailed processing logs:

```bash
tail -f tphk-geocoding.log
```

## Example Workflow

```bash
# 1. Test connection and API keys
python scripts/geocode-tphk-portfolio.py --test

# 2. Run full geocoding
python scripts/geocode-tphk-portfolio.py

# 3. Check results
cat public/data/TPHK_GEOCODING_REPORT.md

# 4. Verify GeoJSON
# Open in QGIS, geojson.io, or your frontend app
```

## Performance Tips

- **First run**: May take 10-30 minutes for 1,000+ addresses
- **Subsequent runs**: Instant (uses cache)
- **Parallel processing**: Not recommended (API rate limits)
- **Batch size**: Process in chunks using `save_interval` parameter

---

**Created**: 2025-12-05
**Version**: 1.0
**Platform**: Nat Cat Platform - Portfolio Management Module
