# Portfolio Region Support Implementation

## Changes Required

### 1. PortfolioMap.tsx

#### Add Region Type and Update Props Interface
```typescript
type Region = 'HK' | 'MO';

interface PortfolioMapProps {
  selectedYear: number | null;
  selectedRegion: Region; // NEW
}
```

#### Update Default Center (line 261)
```typescript
// Before:
const defaultCenter: [number, number] = [22.3193, 114.1694]; // Hong Kong

// After:
const defaultCenter: [number, number] = selectedRegion === 'MO'
  ? [22.1987, 113.5439] // Macau
  : [22.3193, 114.1694]; // Hong Kong
```

#### Update Data Loading Logic (lines 307-373)
```typescript
useEffect(() => {
  async function fetchMapData() {
    try {
      setLoading(true);
      setError(null);

      let allData = [];
      const dataPathPrefix = selectedRegion === 'MO' ? '/data/macau' : '/data/by-year';
      const portfolioPrefix = selectedRegion === 'MO' ? 'tpmo-portfolio' : 'tphk-portfolio';

      if (selectedYear) {
        // Load year-specific file
        const filePath = selectedRegion === 'MO'
          ? `/data/macau/${portfolioPrefix}-${selectedYear}.geojson`
          : `${dataPathPrefix}/${portfolioPrefix}-${selectedYear}.json`;

        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`No data for year ${selectedYear}`);

        const jsonData = await response.json();

        // Handle GeoJSON format for Macau
        if (selectedRegion === 'MO' && jsonData.type === 'FeatureCollection') {
          allData = jsonData.features.map((feature: any) => ({
            ...feature.properties,
            location: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            }
          }));
        } else {
          allData = jsonData;
        }
      } else {
        // Load all years data
        const subsetFile = selectedRegion === 'MO'
          ? '/data/macau/tpmo-portfolio-enhanced.geojson'
          : '/data/tphk_portfolio_subset_5000.json';

        const response = await fetch(subsetFile);
        if (!response.ok) throw new Error(`Failed to load dataset`);

        const jsonData = await response.json();

        if (selectedRegion === 'MO' && jsonData.type === 'FeatureCollection') {
          allData = jsonData.features.map((feature: any) => ({
            ...feature.properties,
            location: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            }
          }));
        } else {
          allData = jsonData;
        }
      }

      // Extract location data with region-specific field mappings
      const allLocs: LocationData[] = allData
        .filter((item: any) => item.location && item.location.lat && item.location.lng)
        .map((item: any) => ({
          lat: item.location.lat,
          lng: item.location.lng,
          sum_insured: item.公司保額 || item.company_sum_insured || item.sum_insured || 0,
          address: item.保險處所 || item.标的位置 || item.address || '',
          region: item.分區 || item.parish || item.region || '',
          policy_id: item.保單號 || item.policyno || item.policy_id || '',
          occupancy: item.佔用性質 || item.occupation_desc || item.occupancy,
        }))
        .filter((loc: LocationData) => loc.sum_insured > 0);

      setAllLocations(allLocs);
      setTotalAvailable(allLocs.length);

      const locations = sampleSize > 0 ? allLocs.slice(0, sampleSize) : allLocs;
      setMapData(locations);
    } catch (error: any) {
      console.error('Failed to fetch map data:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (mounted) {
    fetchMapData();
  }
}, [mounted, selectedYear, sampleSize, selectedRegion]); // Add selectedRegion to dependencies
```

#### Update Currency Display
Change all `HKD` references to support both HKD (Hong Kong) and MOP (Macau):

```typescript
const currencyCode = selectedRegion === 'MO' ? 'MOP' : 'HKD';
```

### 2. Test with Sample Data

Create test file structure:
- `/public/data/macau/tpmo-portfolio-2024.geojson` (from geocode-tpmo-enhanced.py output)
- `/public/data/macau/tpmo-portfolio-2023.geojson`
- `/public/data/macau/tpmo-portfolio-enhanced.geojson` (all years combined)

## Implementation Steps

1. ✅ Update Portfolio page with region selector
2. ⏳ Update PortfolioMap component with region support
3. ⏳ Ensure Macau geocoded data is in correct location
4. ⏳ Test region switching functionality

