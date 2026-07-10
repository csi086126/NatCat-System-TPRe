# Portfolio Management Dashboard - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will get your Portfolio Management Dashboard up and running quickly.

---

## Prerequisites

- ✅ PostgreSQL 18 with PostGIS 3.6 installed and running
- ✅ Node.js 18+ installed
- ✅ Python 3.11+ with psycopg2 installed
- ✅ TPHK geocoded data already imported (68,762 policies)

---

## Step 1: Install Dependencies (2 minutes)

```bash
cd "D:\Nat Cat Platform\UI_system"

# Install Node.js dependencies
npm install

# Install additional libraries for charts and maps
npm install leaflet react-leaflet recharts
```

---

## Step 2: Verify Database (30 seconds)

```bash
# Test database connection
python test_db_connection.py
```

**Expected output**:
```
✅ PostgreSQL Version: 18.1
✅ PostGIS Version: 3.6
✅ Schema 'portfolio' exists
✅ Total records: 68,762
✅ Valid geometries: 68,762 (100%)
```

---

## Step 3: Start Development Server (30 seconds)

```bash
npm run dev
```

**Expected output**:
```
 ▲ Next.js 14.x.x
 - Local:        http://localhost:3000
 - Ready in 2.5s
```

---

## Step 4: Access Dashboard (10 seconds)

Open your browser and navigate to:

**http://localhost:3000/portfolio-new**

---

## Step 5: Explore Features (2 minutes)

### Tab 1: Overview
- View total exposure: HKD 1.64T
- See 68,762 unique policies
- Check top districts

### Tab 2: Map View
- Toggle to "Heatmap" mode
- Click circles to see policy details
- Try different sample sizes

### Tab 3: Districts
- Review 18 districts rankings
- Click column headers to sort
- See exposure distribution

### Tab 4: Analysis
- Select "險種名稱 (Coverage Type)"
- Choose "Sum (總和)" aggregation
- Click "Refresh"
- Try "Export CSV"

### Tab 5: Trends
- Select "Year" granularity
- View annual growth trend
- Try grouping by "分區"

---

## Troubleshooting

### Issue: Port 3000 already in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9
```

### Issue: Python not found in API routes
Edit API route files and update `PYTHON_PATH`:
```typescript
// src/app/api/portfolio/18-districts/route.ts
const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';
// Change to your Python path
```

Find your Python path:
```bash
# Windows
where python

# Mac/Linux
which python3
```

### Issue: Database connection failed
Check `.env.local` file exists with correct credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=postgres
```

### Issue: Map not loading
Verify geocoded data file exists:
```bash
# Check if file exists
ls public/data/tphk-geocoded-portfolio.json

# Check file size (should be ~200MB)
du -h public/data/tphk-geocoded-portfolio.json
```

---

## Quick Reference

### Year Filter
- **All Years**: 68,762 policies, HKD 1.64T
- **2021**: 1,226 policies, HKD 1.13B
- **2022**: 14,671 policies, HKD 121.71B
- **2023**: 28,665 policies, HKD 791.29B
- **2024**: 22,554 policies, HKD 726.69B

### API Endpoints
- `GET /api/portfolio/18-districts?year=2024`
- `POST /api/portfolio/group-by`
- `GET /api/portfolio/fields?field=分區`
- `POST /api/portfolio/time-series`

### Available Grouping Fields
1. 分區 (District)
2. 險種名稱 (Coverage Type)
3. 佔用性質 (Occupancy)
4. 建築等級 (Construction Class)
5. 業務類別 (Business Type)
6. 保單幣別 (Currency)
7. 所處洲 (Continent)
8. 國家或地區 (Country)
9. 巨災名稱 (Event Name)

### Aggregation Functions
- **Sum (總和)**: Total sum
- **Average (平均)**: Mean value
- **Count (計數)**: Record count
- **Min (最小)**: Minimum value
- **Max (最大)**: Maximum value

---

## Next Steps

1. **Customize**: Adjust colors, fonts, and layouts in component files
2. **Integrate**: Add to main navigation menu
3. **Deploy**: Build and deploy to production server
4. **Train**: Share user guide with team members
5. **Monitor**: Set up logging and monitoring

---

## Production Deployment

```bash
# 1. Build for production
npm run build

# 2. Start production server
npm start
# Or use PM2 for process management
pm2 start npm --name "natcat-ui" -- start

# 3. Configure Nginx (optional)
# Reverse proxy to http://localhost:3000
```

---

## Support

**Documentation**:
- User Guide: `MD/PORTFOLIO_MANAGEMENT_USER_GUIDE.md`
- Technical Summary: `MD/PORTFOLIO_DASHBOARD_TECHNICAL_SUMMARY.md`

**Common Use Cases**:
- Risk concentration analysis: Districts tab → Map view
- Product performance: Analysis tab → Group by 險種名稱
- Growth trends: Trends tab → Year granularity
- Export data: Analysis tab → Export CSV

---

**That's it! You're ready to use the Portfolio Management Dashboard.**

**Total Setup Time**: ~5 minutes
**Access URL**: http://localhost:3000/portfolio-new
**Status**: ✅ Production Ready

**Enjoy exploring your portfolio data! 📊**
