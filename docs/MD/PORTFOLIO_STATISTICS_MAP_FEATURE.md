# Portfolio Map - Filter and Statistics Feature

## Overview
Added comprehensive filter and statistics functionality to the Portfolio Map that allows users to filter the map to show only search results and view detailed analytics about the filtered dataset.

**Date Implemented**: 2024-12-16

## Feature Summary

When searching for locations (e.g., "Wang Fuk Court"), users can now:
1. **Filter the map** to show only matching locations
2. **View statistics** about the filtered dataset
3. **Auto-zoom** to fit all filtered locations
4. **Export results** to CSV
5. **View detailed list** in a table modal

## User Workflow

```
1. Search for "Wang Fuk Court"
   ↓
2. Results appear (e.g., 247 found)
   ↓
3. Click "Filter Map" button
   ↓
4. Map updates to show only 247 locations
   ↓
5. Map auto-zooms to fit all locations
   ↓
6. Statistics card appears (right corner)
   ↓
7. User can:
   - View statistics
   - Export CSV
   - Open details list
   - Clear filter to restore view
```

## Components

### 1. Filter Activation

**Location**: Search results dropdown
**Trigger**: "Filter Map" button

**What happens**:
- Converts search results to filtered map data
- Calculates comprehensive statistics
- Updates map to show only filtered locations
- Auto-zooms to fit all filtered locations
- Shows filter status bar
- Displays statistics card

**Code Reference**: [PortfolioMap.tsx:410-432](../src/components/portfolio/PortfolioMap.tsx#L410-L432)

```typescript
const handleFilterMap = () => {
  if (searchResults.length === 0) return;

  // Convert search results to LocationData array
  const filteredLocs: LocationData[] = searchResults.map(r => ({
    lat: r.lat,
    lng: r.lng,
    sum_insured: r.sum_insured,
    address: r.address,
    region: r.region,
    policy_id: r.policy_id,
    occupancy: r.occupancy,
  }));

  // Calculate statistics
  const stats = calculateFilterStats(filteredLocs, searchQuery);
  setFilterStats(stats);

  // Update map data to show only filtered results
  setMapData(filteredLocs);
  setIsFilterActive(true);
  setShowSearchResults(false);
};
```

### 2. Statistics Calculation

**Purpose**: Calculate comprehensive analytics for filtered dataset

**Metrics Calculated**:
- **Count**: Number of filtered policies
- **Total Exposure**: Sum of all sum_insured values
- **Average Exposure**: Mean sum_insured
- **Min/Max Exposure**: Range of sum_insured values
- **By Occupancy**: Breakdown by occupancy type (count + total)
- **Top 3 Policies**: Highest exposure individual policies

**Code Reference**: [PortfolioMap.tsx:378-407](../src/components/portfolio/PortfolioMap.tsx#L378-L407)

```typescript
const calculateFilterStats = (locations: LocationData[], term: string): FilterStats => {
  const exposures = locations.map(l => l.sum_insured);

  // Group by occupancy
  const byOccupancy: Record<string, { count: number; total: number }> = {};
  locations.forEach(loc => {
    const occ = loc.occupancy || 'Unknown';
    if (!byOccupancy[occ]) {
      byOccupancy[occ] = { count: 0, total: 0 };
    }
    byOccupancy[occ].count++;
    byOccupancy[occ].total += loc.sum_insured;
  });

  // Get top 3 by exposure
  const topPolicies = [...locations]
    .sort((a, b) => b.sum_insured - a.sum_insured)
    .slice(0, 3);

  return {
    count: locations.length,
    totalExposure: exposures.reduce((sum, v) => sum + v, 0),
    avgExposure: exposures.reduce((sum, v) => sum + v, 0) / locations.length,
    minExposure: Math.min(...exposures),
    maxExposure: Math.max(...exposures),
    byOccupancy,
    topPolicies,
    searchTerm: term,
  };
};
```

### 3. Filter Status Bar

**Location**: Inside search box, when filter is active
**Appearance**: Blue background with eye icon

**Displays**:
- "Filtering X location(s)" message
- **List** button - Opens details modal
- **Show All** button - Clears filter and restores original view

**Code Reference**: [PortfolioMap.tsx:572-601](../src/components/portfolio/PortfolioMap.tsx#L572-L601)

**UI Structure**:
```
┌─────────────────────────────────────────┐
│ 🔍 [Search disabled when filtered]      │
├─────────────────────────────────────────┤
│ 👁 Filtering 247 locations              │
│                    [List] [Show All]    │
└─────────────────────────────────────────┘
```

### 4. Statistics Card

**Location**: Right top corner of map (absolute positioned)
**Size**: 320px width, auto height
**Background**: White with 95% opacity, blur backdrop

**Sections**:

#### A. Header
- Filter icon + "Filter Statistics" title
- Download CSV button (right side)

#### B. Search Term Display
- Blue background highlight
- Shows the search query used

#### C. Basic Statistics (2x2 Grid)
- **Policies**: Count of filtered locations
- **Total Exposure**: Sum in HKD millions
- **Average**: Mean exposure in HKD millions
- **Range**: Min-Max exposure range

#### D. By Occupancy (Top 3)
- Lists top 3 occupancy types by total exposure
- Shows count and total for each
- Sorted by exposure (highest first)

#### E. Top 3 Policies
- Individual policies with highest exposure
- Shows exposure amount and truncated address
- Numbered 1-3

**Code Reference**: [PortfolioMap.tsx:756-843](../src/components/portfolio/PortfolioMap.tsx#L756-L843)

**Example Display**:
```
┌──────────────────────────────────────┐
│ 🔍 Filter Statistics        📥      │
├──────────────────────────────────────┤
│ "Wang Fuk Court"                     │
├──────────────────────────────────────┤
│ Policies      │ Total Exposure       │
│ 247           │ HKD 371.3M           │
├───────────────┼──────────────────────┤
│ Average       │ Range                │
│ HKD 1.5M      │ 0.5M - 8.2M          │
├──────────────────────────────────────┤
│ By Occupancy                         │
│ Residential     180 (270.0M)         │
│ Commercial       50 (75.5M)          │
│ Industrial       17 (25.8M)          │
├──────────────────────────────────────┤
│ Top 3 by Exposure                    │
│ 1. HKD 8.2M                          │
│    FLAT A, 12/F, WANG SUN HSE...    │
│ 2. HKD 7.8M                          │
│    ROOM 703, WANG SUN HOUSE...      │
│ 3. HKD 6.5M                          │
│    UNIT 5, 8/F, WANG FUK CT...      │
└──────────────────────────────────────┘
```

### 5. Auto-Zoom to Filtered Locations

**Purpose**: Automatically adjust map view to show all filtered locations
**Trigger**: When filter is activated

**Behavior**:
- Calculates bounding box of all filtered locations
- Fits map view to bounds with padding
- Maximum zoom level: 15 (prevents too close zoom)
- Smooth animation (0.5s duration)

**Code Reference**: [PortfolioMap.tsx:208-224](../src/components/portfolio/PortfolioMap.tsx#L208-L224)

```typescript
function AutoZoomToFiltered({ locations }: { locations: LocationData[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 0.5,
      });
    }
  }, [locations, map]);

  return null;
}
```

**Integration**: [PortfolioMap.tsx:544](../src/components/portfolio/PortfolioMap.tsx#L544)

### 6. Details List Modal

**Trigger**: Click "List" button in filter status bar
**Layout**: Full-screen overlay with centered card

**Components**:

#### Header
- List icon + title with search term and count
- Close button (X)

#### Body (Scrollable Table)
- **Columns**: Policy ID, Address, Region, Exposure (HKD), Occupancy
- **Sticky header** for scrolling
- **Hover effect** on rows
- **Responsive layout** with max-width constraints

#### Footer
- Total summary: "X policies | HKD X"
- **Export CSV** button
- **Close** button

**Code Reference**: [PortfolioMap.tsx:846-914](../src/components/portfolio/PortfolioMap.tsx#L846-L914)

**UI Structure**:
```
┌────────────────────────────────────────────────────┐
│ 📋 Filtered Results: "Wang Fuk Court" (247)    ✕  │
├────────────────────────────────────────────────────┤
│ Policy ID    │ Address           │ Region │ ...   │
│──────────────┼───────────────────┼────────┼───────│
│ POL-001      │ FLAT A, 12/F...   │ Tai Po │ ...   │
│ POL-002      │ ROOM 703...       │ Tai Po │ ...   │
│ ...                                                │
├────────────────────────────────────────────────────┤
│ Total: 247 policies | HKD 371,300,000             │
│                      [Export CSV] [Close]          │
└────────────────────────────────────────────────────┘
```

### 7. CSV Export

**Trigger**: Click download button in statistics card OR details modal
**Format**: UTF-8 with BOM (for Excel compatibility)

**Columns**:
1. Policy ID
2. Address (properly escaped quotes)
3. Region
4. Sum Insured (HKD)
5. Occupancy

**Filename Format**:
```
filtered-portfolio-[search-term]-[YYYY-MM-DD].csv
```

**Example**: `filtered-portfolio-wang_fuk_court-2024-12-16.csv`

**Code Reference**: [PortfolioMap.tsx:445-469](../src/components/portfolio/PortfolioMap.tsx#L445-L469)

```typescript
const handleExportCSV = () => {
  if (!filterStats || searchResults.length === 0) return;

  // Create CSV content
  const headers = ['Policy ID', 'Address', 'Region', 'Sum Insured (HKD)', 'Occupancy'];
  const rows = searchResults.map(r => [
    r.policy_id,
    `"${r.address.replace(/"/g, '""')}"`, // Escape quotes in address
    r.region,
    r.sum_insured,
    r.occupancy || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create download with BOM for Excel
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `filtered-portfolio-${searchQuery.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
```

### 8. Clear Filter

**Trigger**: Click "Show All" button in filter status bar
**Purpose**: Restore map to original view (before filter)

**Actions**:
1. Sets `isFilterActive` to false
2. Clears `filterStats`
3. Restores `mapData` based on current `sampleSize`
4. Re-enables search input
5. Hides filter status bar
6. Hides statistics card

**Code Reference**: [PortfolioMap.tsx:435-442](../src/components/portfolio/PortfolioMap.tsx#L435-L442)

```typescript
const handleClearFilter = () => {
  setIsFilterActive(false);
  setFilterStats(null);

  // Restore map data based on sample size
  const locations = sampleSize > 0 ? allLocations.slice(0, sampleSize) : allLocations;
  setMapData(locations);
};
```

## State Management

### New State Variables

```typescript
// Filter functionality
const [isFilterActive, setIsFilterActive] = useState(false);
const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
const [showDetailsList, setShowDetailsList] = useState(false);
```

### Filter Stats Interface

```typescript
interface FilterStats {
  count: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;
  byOccupancy: Record<string, { count: number; total: number }>;
  topPolicies: LocationData[];
  searchTerm: string;
}
```

## Data Flow

```
Search "Wang Fuk Court"
        ↓
Search in allLocations (ALL records)
        ↓
searchResults = 247 matches
        ↓
User clicks "Filter Map"
        ↓
handleFilterMap()
        ↓
    ├─→ Convert searchResults to filteredLocs
    ├─→ calculateFilterStats(filteredLocs)
    ├─→ setMapData(filteredLocs) [Display only 247]
    ├─→ setIsFilterActive(true)
    └─→ setFilterStats(stats)
        ↓
Map Component Renders
        ↓
    ├─→ Shows 247 locations on map
    ├─→ AutoZoomToFiltered triggers
    ├─→ Filter status bar appears
    └─→ Statistics card appears
        ↓
User Actions Available:
    ├─→ Export CSV
    ├─→ View Details List
    └─→ Clear Filter (Show All)
```

## Integration with Existing Features

### ✅ Compatible With:
- **Year selection**: Filter works within selected year
- **Search functionality**: Filter extends search capability
- **Heatmap mode**: Filtered locations shown in heatmap
- **Marker mode**: Filtered locations shown as markers
- **Sample size**: Filter overrides sample size (shows all matches)
- **Selected result**: Red marker persists when filtering

### ⚠️ Important Behaviors:
- When filter is active:
  - Search input is **disabled** (shows filter status instead)
  - Sample size control still works but filter takes precedence
  - Changing year **clears filter** and reloads data
  - Switching view mode (heatmap/markers) **preserves filter**

## UI/UX Enhancements

### Visual Feedback
- ✅ Blue status bar indicates filter is active
- ✅ Eye icon shows filtering is happening
- ✅ Statistics card provides immediate insights
- ✅ Auto-zoom provides spatial context
- ✅ Download icon for CSV export
- ✅ List icon for details view

### Interaction Flow
- ✅ Manual activation (user controls when to filter)
- ✅ Clear indication of filtered count
- ✅ Easy way to restore original view ("Show All")
- ✅ Multiple ways to export (card + modal)
- ✅ Table view for detailed inspection

### Accessibility Considerations
- Clear button labels ("Filter Map", "Show All", "Export CSV")
- Icon + text for important actions
- Hover states on interactive elements
- Modal close options (X button + Close button)
- Disabled state for search input (when filtered)

## Performance Considerations

### Optimization Strategies
1. **Statistics calculation**: O(n) single pass for most metrics
2. **Occupancy grouping**: Uses hash map for efficiency
3. **Top 3 sorting**: Only sorts once per filter activation
4. **Auto-zoom**: Debounced with useEffect dependency
5. **CSV generation**: Client-side, no server request

### Memory Impact
- **Minimal**: Only stores statistics object (~1-2KB)
- **filterStats**: Small metadata object
- **mapData**: Already exists, just updated with filtered subset

### Rendering Performance
- **Improved**: Showing fewer locations when filtered
- Example: 45,528 → 247 locations = 98% reduction in markers
- Map renders faster with fewer elements

## Example Use Cases

### Use Case 1: High-Value Properties in Specific Building
```
1. Search: "International Commerce Centre"
2. Results: 342 properties found
3. Filter Map
4. Statistics show:
   - Total Exposure: HKD 12.5B
   - Average: HKD 36.5M
   - Top policy: HKD 250M (Floor 88)
5. Export CSV for detailed analysis
```

### Use Case 2: Regional Risk Assessment
```
1. Search: "Tai Po"
2. Results: 1,847 properties found
3. Filter Map
4. Statistics show:
   - By Occupancy:
     - Residential: 1,650 (HKD 2.1B)
     - Commercial: 180 (HKD 450M)
     - Industrial: 17 (HKD 75M)
5. View Details List to analyze distribution
```

### Use Case 3: Portfolio Concentration Check
```
1. Search: "WANG FUK COURT"
2. Results: 247 properties found
3. Filter Map
4. Auto-zoom reveals geographic concentration
5. Top 3 policies show highest individual exposures
6. Export for risk mitigation planning
```

## Testing Checklist

- [x] Filter activation from search results
- [x] Statistics calculation accuracy
- [x] Auto-zoom functionality
- [x] Filter status bar display
- [x] Statistics card positioning (right corner)
- [x] Details list modal functionality
- [x] CSV export with proper formatting
- [x] Clear filter / Show All functionality
- [x] Search disabled when filter active
- [x] Filter works with different years
- [x] Filter works with heatmap mode
- [x] Filter works with marker mode
- [x] Large result sets (1000+ locations)
- [x] Small result sets (1-10 locations)
- [x] Single result filtering
- [x] Occupancy breakdown accuracy
- [x] Top 3 policies sorting
- [x] CSV filename formatting
- [x] UTF-8 BOM in exported CSV
- [x] Address quote escaping in CSV

## Known Limitations

1. **No multi-select**: Can only filter based on one search term at a time
2. **No advanced filters**: Cannot combine search with exposure range, occupancy type, etc.
3. **No filter history**: Clearing filter doesn't remember previous state
4. **No comparative analysis**: Cannot compare multiple filtered views side-by-side
5. **Fixed statistics**: Cannot customize which statistics to show
6. **CSV format only**: No Excel (.xlsx) or PDF export

## Future Enhancement Ideas

### Priority 1 (High Impact)
1. **Save filters**: Allow saving common filter configurations
2. **Multi-filter**: Combine search with exposure ranges, occupancy types
3. **Comparative view**: Compare statistics before/after filter
4. **Export to Excel**: Native .xlsx export with formatting

### Priority 2 (Medium Impact)
5. **Custom statistics**: Let users select which metrics to show
6. **Filter presets**: Pre-configured filters (e.g., "High Value", "By Region")
7. **Chart visualizations**: Pie charts for occupancy, bar charts for exposure
8. **Filter history**: Remember last N filters

### Priority 3 (Nice to Have)
9. **PDF reports**: Generate formatted PDF with map snapshot + statistics
10. **Email export**: Send filtered results directly via email
11. **Filter sharing**: Share filter configuration via URL parameters
12. **Advanced analytics**: Percentiles, standard deviation, outliers

## Files Modified

### [src/components/portfolio/PortfolioMap.tsx](../src/components/portfolio/PortfolioMap.tsx)

**New Interfaces** (Lines 43-52):
- `FilterStats` - Statistics data structure

**New State Variables** (Lines 243-245):
- `isFilterActive` - Filter active flag
- `filterStats` - Statistics object
- `showDetailsList` - Modal visibility flag

**New Components** (Lines 208-224):
- `AutoZoomToFiltered` - Auto-zoom component

**New Functions** (Lines 378-469):
- `calculateFilterStats()` - Statistics calculation
- `handleFilterMap()` - Filter activation
- `handleClearFilter()` - Filter clearing
- `handleExportCSV()` - CSV export

**New UI Components**:
- Lines 572-601: Filter status bar
- Lines 614-622: Filter Map button
- Lines 756-843: Statistics card
- Lines 846-914: Details list modal

**Integration Points**:
- Line 371-374: Clear filter when clearing search
- Line 544: Auto-zoom component integration
- Line 559: Disable search when filter active

## Related Documentation

- [Portfolio Map Search Feature](./PORTFOLIO_MAP_SEARCH_FEATURE.md) - Base search functionality
- [Search Issue Fix](./SEARCH_ISSUE_FIX.md) - Search optimization details
- [Portfolio Map Improvements](./PORTFOLIO_MAP_IMPROVEMENTS.md) - Overall map enhancements
- [Portfolio Data Split by Year](./PORTFOLIO_DATA_SPLIT_BY_YEAR.md) - Data structure

## Summary

This feature adds powerful filtering and analytics capabilities to the Portfolio Map:

| Aspect | Before | After |
|--------|--------|-------|
| Search results | View only | Can filter map + view statistics |
| Analytics | None | Comprehensive statistics card |
| Export | None | CSV export of filtered results |
| Details view | Popups only | Full table modal |
| Spatial context | Manual zoom | Auto-zoom to filtered area |
| User control | View all or sample | Filter to specific subset |

**Status**: ✅ **COMPLETE**

**User Benefits**:
- 📊 Instant analytics on filtered datasets
- 🗺️ Visual focus on specific locations
- 📥 Export capabilities for further analysis
- 📋 Detailed table view for inspection
- 🎯 Precise control over what's displayed

**Technical Quality**:
- Clean state management
- Efficient statistics calculation
- Responsive UI components
- Proper CSV formatting
- Smooth animations and transitions

---

**Implementation Date**: 2024-12-16
**Feature**: Filter and Statistics for Portfolio Map
**Component**: [PortfolioMap.tsx](../src/components/portfolio/PortfolioMap.tsx)
