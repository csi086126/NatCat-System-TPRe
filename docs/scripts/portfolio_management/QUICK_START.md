# Portfolio Management Quick Start Guide

## 📋 Overview

This guide will help you set up and run the complete Portfolio Management system for TPHK data.

## 🔧 Prerequisites

### 1. PostgreSQL 15 + PostGIS 3.3

**Installation:**
- Download PostgreSQL 15 from https://www.postgresql.org/download/
- During installation, ensure **PostGIS** extension is selected
- Default credentials:
  - Username: `postgres`
  - Password: (set during installation)
  - Port: `5432`

**Verify Installation:**
```bash
psql --version
# Should show: psql (PostgreSQL) 15.x
```

### 2. Python Environment (Anaconda)

You already have Anaconda installed. Required packages are in `requirements.txt`.

### 3. Google Maps API Key

You already have this configured in `.env` file.

## 🚀 Quick Start (5 Steps)

### Step 1: Configure Environment

Edit `.env` file in the `portfolio_management` folder:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here  # ← Change this!

# API Keys (already configured)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AMAP_API_KEY=your_amap_api_key

# Data Paths
TPHK_DATA_DIR=D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Step 2: Install Python Dependencies

```bash
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
pip install -r requirements.txt
```

### Step 3: Run Test Pipeline (10 minutes)

**Test with 100 records first:**

```bash
run-test-pipeline.bat
```

This will:
1. ✅ Create database and schema
2. ✅ Geocode 100 sample records
3. ✅ Load data to PostgreSQL
4. ✅ Calculate zone accumulations
5. ✅ Generate GeoJSON files

**Check the results:**
- Open pgAdmin and check `portfolio.policies` table
- Check `D:\Nat Cat Platform\UI_system\public\data\` for JSON files

### Step 4: Run Full Pipeline (2-4 hours)

**Process all 40,000+ records:**

```bash
run-complete-pipeline.bat
```

⚠️ **Warning:** This will take 2-4 hours. Make sure:
- Your computer won't sleep
- PostgreSQL is running
- You have stable internet (for Google Maps API)

### Step 5: Start API Server

```bash
run-api.bat
```

API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs (Interactive Swagger UI)

## 📊 Data Files Generated

After running the pipeline, these files will be created:

### In `output/` folder:
- `tphk-geocoded-full.json` - Complete geocoded dataset
- `tphk-geocoded-full.csv` - CSV export
- `tphk-geocoding-cache.json` - Geocoding cache (to avoid re-geocoding)

### In `D:\Nat Cat Platform\UI_system\public\data\`:
- `tphk-policies.geojson` - GeoJSON for map markers
- `tphk-zone-accumulations.json` - Zone statistics
- `tphk-events.json` - Event data
- `tphk-heatmap.json` - Heatmap data
- `tphk-summary.json` - Summary statistics

## 🔌 API Endpoints

### Policies
- `GET /api/policies/` - List policies with filters
- `GET /api/policies/{policy_id}` - Get single policy
- `GET /api/policies/geojson/all` - Get GeoJSON

**Example:**
```bash
curl "http://localhost:8000/api/policies/?region=葵青區&limit=10"
```

### Zone Accumulations
- `GET /api/zones/` - List all zones
- `GET /api/zones/{region}` - Get zone details
- `GET /api/zones/{region}/policies` - Get policies in zone
- `GET /api/zones/limits/monitoring` - Zone limit monitoring

**Example:**
```bash
curl "http://localhost:8000/api/zones/葵青區"
```

### Events
- `GET /api/events/` - List all events
- `GET /api/events/{event_code}` - Get event details
- `GET /api/events/{event_code}/policies` - Get affected policies

### Statistics
- `GET /api/stats/summary` - Overall summary
- `GET /api/stats/heatmap` - Heatmap data
- `GET /api/stats/distribution/sum_insured` - TSI distribution
- `GET /api/stats/building_age` - Building age statistics

## 🗂️ Database Schema

### Main Tables:

#### `portfolio.policies`
- All 40,000+ policies with geocoding results
- Contains all original Chinese fields + English mappings
- PostGIS geometry column for spatial queries

#### `portfolio.zone_accumulations`
- Pre-calculated statistics for each Hong Kong district
- Total Sum Insured, policy counts, breakdowns

#### `portfolio.zone_limits`
- User-defined capacity limits per zone
- Warning and critical thresholds

#### `portfolio.events`
- Catastrophic event statistics
- Affected regions and exposure

## 🔍 Querying Examples

### Using pgAdmin / psql:

```sql
-- Get top 10 zones by exposure
SELECT region, total_sum_insured, policy_count
FROM portfolio.zone_accumulations
ORDER BY total_sum_insured DESC
LIMIT 10;

-- Find policies within 1km of a point
SELECT policy_id, address, sum_insured
FROM portfolio.policies
WHERE ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(114.1188, 22.3580), 4326)::geography,
    1000  -- 1km in meters
);

-- Get occupancy breakdown for a zone
SELECT
    occupancy,
    COUNT(*) as count,
    SUM(sum_insured) as total_tsi
FROM portfolio.policies
WHERE region = '葵青區'
GROUP BY occupancy
ORDER BY total_tsi DESC;
```

### Using Python:

```python
import requests

# Get zone accumulations
response = requests.get('http://localhost:8000/api/zones/')
zones = response.json()['data']

# Get policies in a specific region
response = requests.get('http://localhost:8000/api/policies/', params={
    'region': '葵青區',
    'min_sum_insured': 1000000
})
policies = response.json()['data']

# Get heatmap data
response = requests.get('http://localhost:8000/api/stats/heatmap')
heatmap = response.json()['data']
```

## 🎨 Frontend Integration

### Option 1: Use Static GeoJSON Files

Load files directly from `public/data/`:

```typescript
// In your Next.js component
const [zones, setZones] = useState([]);

useEffect(() => {
  fetch('/data/tphk-zone-accumulations.json')
    .then(res => res.json())
    .then(data => setZones(data));
}, []);
```

### Option 2: Use API (Recommended)

```typescript
const [policies, setPolicies] = useState([]);

useEffect(() => {
  fetch('http://localhost:8000/api/policies/?limit=5000')
    .then(res => res.json())
    .then(data => setPolicies(data.data));
}, []);
```

## 🛠️ Maintenance

### Re-run Aggregations

If you add new policies or update data:

```bash
cd data_processing
python 03_aggregate.py
python 04_generate_geojson.py
```

### Clear and Reload

To completely reset and reload data:

```bash
# 1. Drop and recreate schema
psql -U postgres -d natcat_platform -f database/schema.sql

# 2. Re-run pipeline
run-complete-pipeline.bat
```

### Update Zone Limits

```sql
-- Add a new zone limit
INSERT INTO portfolio.zone_limits (
    region, capacity_limit, warning_threshold, critical_threshold
) VALUES (
    '葵青區', 5000000000, 0.80, 0.90
);

-- View limit monitoring
SELECT * FROM portfolio.v_limit_monitoring;
```

## 📝 Logs

All scripts generate log files:
- `01_geocode_full.log`
- `02_load_to_db.log`
- `03_aggregate.log`
- `04_generate_geojson.log`

Check these if you encounter errors.

## ❓ Troubleshooting

### PostgreSQL Connection Failed
```
Error: could not connect to server
```
**Solution:**
- Ensure PostgreSQL is running (check Windows Services)
- Verify credentials in `.env` file
- Check if port 5432 is open

### Geocoding Rate Limit
```
Error: Google Maps API rate limit exceeded
```
**Solution:**
- The script has built-in rate limiting (10 req/sec)
- Use the cache - it avoids re-geocoding same addresses
- Consider processing in batches using `--limit` flag

### Import Error
```
ModuleNotFoundError: No module named 'xxx'
```
**Solution:**
```bash
pip install -r requirements.txt
```

### Database Schema Already Exists
```
Error: table "policies" already exists
```
**Solution:**
```sql
-- Drop existing schema
DROP SCHEMA portfolio CASCADE;
-- Re-run init_db.py
python database/init_db.py
```

## 📞 Support

If you encounter issues:
1. Check the log files in `portfolio_management/` folder
2. Verify PostgreSQL is running: `psql -U postgres -l`
3. Test API connection: http://localhost:8000/health
4. Review the console output for error messages

## 🎯 Next Steps

After setup:
1. ✅ Verify data in pgAdmin
2. ✅ Test API endpoints at http://localhost:8000/docs
3. ✅ Integrate with frontend `/asset` page
4. ✅ Set up zone limits for capacity monitoring
5. ✅ Customize heatmap and visualizations

---

**Version:** 1.0
**Last Updated:** 2025-12-09
**Status:** Ready for Production
