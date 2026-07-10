# Portfolio Management Dashboard - User Guide

## Overview

The Portfolio Management Dashboard provides comprehensive analysis and visualization of the TPHK insurance portfolio with **68,762 unique policies** and **HKD 1.64 trillion** in total exposure.

**Access URL**: [http://localhost:3000/portfolio-new](http://localhost:3000/portfolio-new)

---

## Dashboard Features

### 5 Main Tabs

1. **Overview** - KPI cards and summary statistics
2. **Map View** - Interactive heatmap visualization
3. **Districts** - 18 districts detailed rankings
4. **Analysis** - Multi-dimensional flexible analysis
5. **Trends** - Time series trend analysis

---

## Tab 1: Overview

### Purpose
Quick summary of portfolio exposure and key metrics.

### Features

#### KPI Cards (4 metrics)
1. **Total Policies**: Count of unique policies
2. **Total Exposure**: Sum of 公司保額 (company insured amount)
3. **Average Exposure**: Mean exposure per policy
4. **Top District**: District with highest total exposure

#### Quick Insights
- Year-over-year distribution breakdown
- Top 5 districts by exposure
- Coverage type distribution

### How to Use
1. Select a year filter (2021-2024) or "All Years" at the top
2. View KPI cards for quick metrics
3. Scroll down to see detailed breakdowns

---

## Tab 2: Map View

### Purpose
Geographic visualization of portfolio exposure using heatmap.

### Features

#### Heatmap Visualization
- **Circle Size**: Proportional to exposure amount
- **Color Gradient**:
  - 🔵 Blue = Low exposure (bottom 33%)
  - 🟡 Yellow = Medium exposure (33-67%)
  - 🔴 Red = High exposure (top 33%)

#### Controls
1. **View Mode Toggle**:
   - **Heatmap**: Colored circles with size/color based on exposure
   - **Markers**: Traditional map pins

2. **Sample Size Selector**:
   - 500 points (fastest)
   - 1,000 points (recommended)
   - 2,000 points
   - 5,000 points (slowest, most detailed)

#### Interactive Features
- Click any circle/marker to see popup with:
  - Policy ID (保單號)
  - Address (保險處所)
  - Region (分區)
  - Sum Insured (公司保額)
  - Occupancy type (佔用性質) if available

### How to Use
1. Select year filter to focus on specific year
2. Choose "Heatmap" or "Markers" view mode
3. Adjust sample size based on performance needs
4. Zoom and pan to explore Hong Kong regions
5. Click circles to view policy details

### Performance Tips
- Use 500-1000 points for faster loading
- Switch to Markers view if heatmap is slow
- Apply year filter to reduce data volume

---

## Tab 3: Districts

### Purpose
Detailed analysis of exposure distribution across Hong Kong's 18 districts.

### Features

#### Summary Cards (Top Section)
1. **Top 3 Districts**: Medal rankings with exposure amounts
2. **Exposure Distribution**: Highest, Average, Lowest exposure values
3. **Coverage Stats**: Districts covered, total policies, average per district

#### Detailed Rankings Table
- **Sortable Columns** (click headers to sort):
  - Policies: Policy count per district
  - Total Exposure: Sum of 公司保額
  - Avg Exposure: Average exposure per policy

- **Visual Elements**:
  - Progress bars showing relative exposure
  - Share % of total portfolio
  - District icons

#### Exposure Distribution Chart
- Horizontal bars showing each district's exposure
- Percentage of total portfolio
- Policy count per district

### How to Use
1. Select year filter to analyze specific year
2. Click column headers to sort by different metrics
3. Review top 3 districts in summary cards
4. Scroll through detailed table for all 18 districts
5. Use visualization chart to compare relative sizes

### Key Insights
- **观塘区** typically has highest exposure
- **元朗区** and **中西区** are also major exposure centers
- Top 3 districts usually represent ~30% of total exposure

---

## Tab 4: Analysis (Multi-Dimensional)

### Purpose
Flexible filtering and grouping by any field with custom aggregations.

### Features

#### Configuration Panel

**1. Group By Field** (9 options categorized):

**Geographic**:
- 分區 (District) - 18 Hong Kong districts
- 所處洲 (Continent)
- 國家或地區 (Country)

**Business**:
- 險種名稱 (Coverage Type) - e.g., 財產全險
- 業務類別 (Business Type)

**Property**:
- 佔用性質 (Occupancy) - Residential, Commercial, Industrial
- 建築等級 (Construction Class)

**Financial**:
- 保單幣別 (Currency) - HKD, USD, etc.

**Event**:
- 巨災名稱 (Event Name) - Natural disaster events

**2. Aggregation Function** (5 options):
- **Sum (總和)**: Total sum of values
- **Average (平均)**: Mean value
- **Count (計數)**: Number of records
- **Min (最小)**: Minimum value
- **Max (最大)**: Maximum value

**3. Results Limit**:
- Top 10, 20, 50, or 100 results

#### Results Display
- **Summary Cards**:
  - Total Groups: Number of unique values
  - Total Value: Aggregated metric value
  - Top Group: Highest value group

- **Detailed Results**:
  - Ranked list with index numbers
  - Record count per group
  - Metric value (formatted as HKD)
  - Percentage of total
  - Progress bar visualization

#### Export Feature
- **Export CSV** button downloads results as CSV file
- Filename: `portfolio_analysis_{field}_{timestamp}.csv`
- Columns: Group, Record Count, Metric Value

### How to Use

**Example 1: Analyze exposure by occupancy type**
1. Group By Field: Select "佔用性質 (Occupancy)"
2. Aggregation Function: Select "Sum (總和)"
3. Results Limit: Select "Top 20"
4. Click "Refresh" to update
5. Review ranked results showing total exposure per occupancy type
6. Click "Export CSV" to download data

**Example 2: Count policies by coverage type**
1. Group By Field: Select "險種名稱 (Coverage Type)"
2. Aggregation Function: Select "Count (計數)"
3. Results Limit: Select "Top 10"
4. View which coverage types are most common

**Example 3: Find highest exposure business types**
1. Group By Field: Select "業務類別 (Business Type)"
2. Aggregation Function: Select "Max (最大)"
3. Results Limit: Select "Top 50"
4. See maximum single policy exposure per business type

### Common Use Cases
- **Risk Concentration**: Group by 分區, aggregate Sum → See which districts have highest concentration
- **Product Mix**: Group by 險種名稱, aggregate Count → Understand product portfolio composition
- **Property Analysis**: Group by 佔用性質, aggregate Average → Compare average exposure by occupancy
- **Currency Exposure**: Group by 保單幣別, aggregate Sum → See currency distribution

---

## Tab 5: Trends (Time Series)

### Purpose
Analyze exposure trends over time with multiple granularity levels.

### Features

#### Configuration Panel

**1. Time Granularity** (3 options):
- **Year**: Annual trends (2021-2024)
- **Quarter**: Quarterly trends (2021-Q1 through 2024-Q4)
- **Month**: Monthly trends (detailed time series)

**2. Metric Selection** (2 options):
- **公司保額**: Company insured amount (most common)
- **共保前總保險金額**: Total sum insured before coinsurance

**3. Aggregation Function** (5 options):
- Sum, Average, Count, Min, Max

**4. Group By (Optional)**:
- None (overall trend)
- 分區 (District) - Compare districts over time
- 險種名稱 (Coverage Type) - Compare products over time
- 業務類別 (Business Type) - Compare business lines over time

**5. Chart Type Toggle**:
- **Line Chart**: Better for trends
- **Bar Chart**: Better for comparisons

#### Trend Indicator
- **Up Arrow** (green): Increasing trend with percentage
- **Down Arrow** (red): Decreasing trend with percentage
- **Neutral** (gray): No significant change

#### Legend
- Click legend items to show/hide specific groups
- Hover over data points to see exact values

### How to Use

**Example 1: View annual exposure growth**
1. Time Granularity: Select "Year"
2. Metric: Select "公司保額"
3. Aggregation: Select "Sum (總和)"
4. Group By: Select "None (Overall)"
5. Chart Type: Select "Line Chart"
6. Review trend showing year-over-year growth
7. Check trend indicator for growth rate

**Example 2: Compare quarterly exposure by district**
1. Time Granularity: Select "Quarter"
2. Metric: Select "公司保額"
3. Aggregation: Select "Sum (總和)"
4. Group By: Select "分區 (District)"
5. Chart Type: Select "Line Chart"
6. View multiple colored lines showing each district's quarterly trend
7. Click legend to focus on specific districts

**Example 3: Monthly policy count growth**
1. Time Granularity: Select "Month"
2. Metric: Select "公司保額"
3. Aggregation: Select "Count (計數)"
4. Group By: Select "None (Overall)"
5. Chart Type: Select "Bar Chart"
6. See detailed monthly policy acquisition pattern

### Key Insights
- **2024 exposure peak**: HKD 726.69B in 2024
- **Growth trend**: Steady increase from 2021 to 2023
- **Seasonality**: Quarterly analysis may reveal seasonal patterns

---

## Year Filter (Global)

### Location
Top of the page, below the page title.

### Options
- **All Years**: View complete portfolio (2021-2024)
- **2021**: 1,226 policies, HKD 1.13B
- **2022**: 14,671 policies, HKD 121.71B
- **2023**: 28,665 policies, HKD 791.29B
- **2024**: 22,554 policies, HKD 726.69B

### Behavior
- Applies to all tabs except Trends (which has its own time controls)
- Filters all API queries and visualizations
- Updates all KPIs, tables, charts in real-time

---

## Data Source

### Database
- **PostgreSQL 18** with **PostGIS 3.6** extension
- Schema: `portfolio`
- Table: `policies`
- Records: 68,762 unique policies (194,506 total records including event duplicates)

### File Source (for Map View)
- Path: `/public/data/tphk-geocoded-portfolio.json`
- Contains geocoded location data with lat/lng coordinates
- 97.9% geocoding success rate

### API Endpoints

All API routes are located under `/api/portfolio/`:

1. **GET `/api/portfolio/18-districts`**
   - Query params: `?year=2024` (optional)
   - Returns: District exposure statistics

2. **POST `/api/portfolio/group-by`**
   - Body: `{ groupBy, aggregations, filters, limit }`
   - Returns: Grouped aggregation results

3. **GET `/api/portfolio/fields`**
   - Query params: `?field=分區` (optional)
   - Returns: Available fields or unique values

4. **POST `/api/portfolio/time-series`**
   - Body: `{ timeGrain, metric, aggFunc, groupBy }`
   - Returns: Time series data points

---

## Technical Requirements

### Dependencies
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "recharts": "^2.10.0",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-select": "latest"
}
```

### Installation
```bash
npm install leaflet react-leaflet recharts
```

### Environment Variables
```bash
# .env.local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=postgres

# Python path (for API routes)
PYTHON_PATH=C:\Users\sichen\AppData\Local\anaconda3\python.exe
```

---

## Performance Optimization

### Map View
- Default sample size: 1,000 points
- Reduce to 500 for faster loading
- Increase to 5,000 only if needed

### Analysis Tab
- Use "Top 10" or "Top 20" for faster queries
- Apply year filter to reduce dataset size

### Trends Tab
- Start with "Year" granularity for overview
- Use "Quarter" or "Month" only when needed
- Limit grouping to essential dimensions

---

## Common Workflows

### Workflow 1: New Portfolio Review
1. Go to **Overview** tab → View KPIs and top districts
2. Go to **Districts** tab → Review detailed rankings
3. Go to **Map View** tab → See geographic distribution
4. Go to **Trends** tab → Check growth trajectory

### Workflow 2: Risk Concentration Analysis
1. **Districts** tab → Identify top 3 districts by exposure
2. **Map View** tab → Filter by year, zoom to top districts
3. **Analysis** tab → Group by 佔用性質, see occupancy breakdown
4. Export CSV for detailed analysis

### Workflow 3: Product Performance
1. **Analysis** tab → Group by 險種名稱 (Coverage Type)
2. Aggregation: Sum → See total exposure per product
3. Switch to Count → See policy count per product
4. **Trends** tab → Group by 險種名稱, view product growth

### Workflow 4: Year-over-Year Comparison
1. Select "2023" year filter
2. Note total exposure and top districts
3. Select "2024" year filter
4. Compare metrics to identify changes
5. **Trends** tab → View complete trend line

---

## Troubleshooting

### Map Not Loading
- Check if `/public/data/tphk-geocoded-portfolio.json` exists
- Try reducing sample size to 500 points
- Clear browser cache and reload

### API Errors
- Verify PostgreSQL is running on port 5432
- Check `.env.local` has correct database credentials
- Ensure Python path is correct in API routes
- Check Python analytics script exists at specified path

### Slow Performance
- Apply year filter to reduce dataset
- Reduce map sample size
- Limit Analysis results to Top 10/20
- Use Year granularity instead of Month in Trends

### Empty Data
- Verify data was imported successfully: Run `python test_db_connection.py`
- Check database has records: `SELECT COUNT(*) FROM portfolio.policies;`
- Verify year filter matches data years (2021-2024)

---

## Data Dictionary

### Key Fields

| Chinese Name | English Name | Description | Example |
|-------------|-------------|-------------|---------|
| 保單號 | policy_id | Unique policy identifier | HKP-2024-00001 |
| 分區 | district | Hong Kong district (18 total) | 觀塘區, 元朗區 |
| 公司保額 | sum_insured | Company insured amount | 5000000.00 |
| 險種名稱 | coverage_name | Type of insurance coverage | 財產全險 |
| 佔用性質 | occupancy | Property occupancy type | Residential, Commercial |
| 建築等級 | construction_class | Building construction rating | Class A, Class B |
| 業務類別 | business_type | Business line category | Direct, Reinsurance |
| 保單幣別 | currency | Policy currency | HKD, USD |
| 保單起期 | policy_start | Policy start date | 2024-01-15 |
| 保單止期 | policy_end | Policy end date | 2025-01-15 |
| 巨災名稱 | event_name | Natural disaster event name | Typhoon Mangkhut |

---

## Support and Further Development

### Current Status
✅ All 5 tabs fully implemented
✅ 4 API routes operational
✅ PostgreSQL integration complete
✅ Heatmap visualization working
✅ 68,762 policies loaded

### Recommended Enhancements
1. Add PDF export for reports
2. Implement advanced filters (date range, exposure range)
3. Add claims data integration
4. Create automated email reports
5. Add user authentication and role-based access

### Contact
For technical support or feature requests, contact the development team.

---

**Last Updated**: December 15, 2025
**Version**: 1.0
**Data Coverage**: 2021-2024
**Total Portfolio**: 68,762 policies, HKD 1.64 trillion
