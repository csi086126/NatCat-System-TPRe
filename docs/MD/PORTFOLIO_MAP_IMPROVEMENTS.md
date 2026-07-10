# Portfolio Map Improvements Summary

## Changes Made

### 1. Enhanced Limit/Sample Size Controls

#### New Features
- **More limit options**: Added 10k, 20k, and "Show All" options
- **Dynamic "All" option**: Shows actual total count (e.g., "All (42,888 pts)")
- **Better display**: Shows "Showing X of Y policies" in the header

#### Available Limits
| Option | Records |
|--------|---------|
| 500 pts | 500 |
| 1k pts | 1,000 |
| 2k pts | 2,000 |
| 5k pts | 5,000 |
| 10k pts | 10,000 |
| 20k pts | 20,000 |
| All | All available records |

#### Technical Implementation
```typescript
// State to track total available records
const [totalAvailable, setTotalAvailable] = useState(0);

// Extract all locations first
const allLocations = allData.filter(...).map(...);
setTotalAvailable(allLocations.length);

// Apply limit (0 means show all)
const locations = sampleSize > 0
  ? allLocations.slice(0, sampleSize)
  : allLocations;
```

### 2. Improved Heatmap Legend with Actual Values

#### Before
- Only showed "Low", "Medium", "High" labels
- No indication of what the thresholds were
- Users couldn't tell what values corresponded to each color

#### After
- **Shows actual HKD amounts** for each threshold
- **Dynamic thresholds** based on current dataset max exposure
- **Clearer display** with amount ranges

#### Legend Format
```
Low      < HKD X.XM
Medium   HKD X.XM - Y.YM
High     ≥ HKD Y.YM

* Based on max exposure: HKD Z.ZM
* Circle size indicates exposure amount
```

### 3. Classification Logic Details

The heatmap uses **relative classification** based on the current dataset:

```typescript
// Calculate max exposure from visible data
const maxExposure = Math.max(...mapData.map(d => d.sum_insured));

// Define thresholds
const lowThreshold = maxExposure * 0.33;      // 33%
const mediumThreshold = maxExposure * 0.67;   // 67%

// Color assignment
if (normalizedExposure < 0.33) {
  color = blue;   // Low
} else if (normalizedExposure < 0.67) {
  color = yellow; // Medium
} else {
  color = red;    // High
}
```

#### Classification Rules
- **Low (Blue)**: Sum Insured < 33% of max
- **Medium (Yellow)**: Sum Insured 33%-67% of max
- **High (Red)**: Sum Insured ≥ 67% of max

### 4. Example Scenarios

#### Scenario 1: Year 2024 Data (42,888 policies)
Assume max exposure = HKD 100M

```
Low      < HKD 33.0M
Medium   HKD 33.0M - 67.0M
High     ≥ HKD 67.0M
```

#### Scenario 2: Year 2023 Data (101,135 policies)
Assume max exposure = HKD 150M

```
Low      < HKD 49.5M
Medium   HKD 49.5M - 100.5M
High     ≥ HKD 100.5M
```

**Note**: Thresholds change dynamically based on the dataset!

## UI Improvements

### Top Control Bar
```
Map Visualization
Showing 1,000 of 42,888 policies (2024) | Exp: HKD 45.2B

[Heatmap] [Markers] [1k pts ▼]
```

### Legend Display
```
┌─────────────────────────────────┐
│ Heatmap Legend                  │
├─────────────────────────────────┤
│ 🔵 Low     < HKD 33.0M         │
│ 🟡 Medium  HKD 33.0M - 67.0M   │
│ 🔴 High    ≥ HKD 67.0M         │
│                                 │
│ * Based on max: HKD 100.0M      │
│ * Circle size = exposure        │
└─────────────────────────────────┘
```

## Performance Considerations

### Small Limits (500-2000)
- ✅ Very fast rendering
- ✅ Smooth pan/zoom
- ✅ Recommended for exploration

### Medium Limits (5000-10000)
- ✅ Good performance on modern browsers
- ⚠️ May have slight lag on zoom
- ✅ Good for detailed analysis

### Large Limits (20000+)
- ⚠️ Slower rendering
- ⚠️ May lag on older devices
- ⚠️ High memory usage

### "All" Option
- ⚠️ Use with caution for large datasets
- 2021: ~3,649 pts ✅ (Safe)
- 2022: ~46,834 pts ⚠️ (Moderate)
- 2023: ~101,135 pts ❌ (Heavy - may freeze browser)
- 2024: ~42,888 pts ⚠️ (Moderate)

**Recommendation**: For 2023 (largest dataset), stick to 20k or less for optimal performance.

## User Benefits

### 1. Transparency
- Users now see exactly what "Low/Medium/High" means in HKD
- Clear indication of how many records are shown vs available
- Understand the basis for color coding

### 2. Flexibility
- Can choose performance vs completeness tradeoff
- "All" option for years with fewer records
- Graduated options for gradual increases

### 3. Context Awareness
- Legend updates dynamically based on visible data
- Different years have different thresholds (shown clearly)
- Max exposure value displayed for reference

## Files Modified

1. **PortfolioMap.tsx**
   - Line 147: Added `totalAvailable` state
   - Line 187-206: Updated data processing logic
   - Line 229-233: Added threshold calculations
   - Line 290: Updated header to show "X of Y"
   - Line 318-330: Enhanced limit selector with more options
   - Line 341-378: Improved legend with actual values

## Future Enhancements

Potential improvements:
1. **Custom thresholds**: Allow users to set their own HKD thresholds
2. **Quartile mode**: Use 25/50/75 percentiles instead of 33/67
3. **Logarithmic scale**: For datasets with extreme outliers
4. **Save preferences**: Remember user's preferred limit setting
5. **Performance warning**: Warn when selecting "All" for large datasets

## Testing Checklist

- [x] Test all limit options (500 to All)
- [x] Verify "All" shows correct total count
- [x] Check legend shows proper HKD amounts
- [x] Test with different years (2021-2024)
- [x] Verify header shows "X of Y" correctly
- [x] Confirm thresholds update when changing limits
- [x] Test performance with large datasets

## Related Documents

- [Portfolio Data Split by Year](./PORTFOLIO_DATA_SPLIT_BY_YEAR.md)
- Original error fix: Changed from 377MB to year-specific files
- Component: [PortfolioMap.tsx](../src/components/portfolio/PortfolioMap.tsx)
