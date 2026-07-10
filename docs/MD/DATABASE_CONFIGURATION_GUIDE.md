# Database Configuration Guide

## Quick Setup (3 Steps)

### Step 1: Update Database Password

Edit the Python analytics script:

**File**: `D:\Nat Cat Platform\scripts\portfolio_management\analytics\portfolio_analytics.py`

```python
# Line 26-33: Update password
DB_CONFIG = {
    'host': 'localhost',
    'port': '5432',
    'database': 'natcat_platform',
    'user': 'postgres',
    'password': 'YOUR_ACTUAL_PASSWORD_HERE'  # ← Change this line
}
```

### Step 2: Test Database Connection

```bash
cd "D:\Nat Cat Platform\scripts\portfolio_management\analytics"

# Test basic connection
"C:\Users\sichen\AppData\Local\anaconda3\python.exe" portfolio_analytics.py --dimension district --output pretty

# Expected output: JSON with policy statistics
# If error: Check password, verify PostgreSQL is running
```

### Step 3: Verify in UI

1. Open browser: http://10.253.22.15:3004
2. Navigate to: **Portfolio Management (Asset)** → **Analytics** → **📊 Statistics** tab
3. Check metadata at bottom of page:
   - Should show: `"dataSource": "postgresql"`
   - Should NOT show: `"dataSource": "mock"`

---

## Troubleshooting

### Error: "password authentication failed"

**Symptom**:
```
psycopg2.OperationalError: password authentication failed for user "postgres"
```

**Solutions**:

1. **Find correct password**:
   - Check `.env` file in project root
   - Check PostgreSQL installation documents
   - Reset password if forgotten:
     ```sql
     -- In PostgreSQL shell (psql)
     ALTER USER postgres WITH PASSWORD 'new_password';
     ```

2. **Verify PostgreSQL is running**:
   ```bash
   # Windows
   sc query postgresql-x64-15

   # Expected: STATE: RUNNING
   ```

3. **Test connection manually**:
   ```bash
   psql -U postgres -d natcat_platform
   # Should prompt for password and connect successfully
   ```

### Error: "database does not exist"

**Symptom**:
```
psycopg2.OperationalError: database "natcat_platform" does not exist
```

**Solution**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE natcat_platform;

# Verify
\l
# Should list natcat_platform
```

### Error: "relation 'portfolio.policies' does not exist"

**Symptom**:
```
psycopg2.errors.UndefinedTable: relation "portfolio.policies" does not exist
```

**Solution**:
```sql
-- Connect to database
psql -U postgres -d natcat_platform

-- Create schema
CREATE SCHEMA IF NOT EXISTS portfolio;

-- Create table (example structure)
CREATE TABLE portfolio.policies (
    保單號 VARCHAR(50),
    分區 VARCHAR(50),
    經營性質 VARCHAR(100),
    建築等級 VARCHAR(50),
    公司保額 NUMERIC,
    保單起期 DATE
);

-- Verify
\dt portfolio.*
-- Should list portfolio.policies
```

---

## Database Schema Reference

### Table: portfolio.policies

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| 保單號 | VARCHAR(50) | Policy number | "TPHK-2024-001234" |
| 分區 | VARCHAR(50) | Administrative district | "中西區", "灣仔", "東區" |
| 經營性質 | VARCHAR(100) | Business/occupancy type | "住宅", "商業", "工業" |
| 建築等級 | VARCHAR(50) | Construction grade | "I級 (混凝土)", "II級 (鋼結構)" |
| 公司保額 | NUMERIC | Company exposure (HKD) | 2500000.00 |
| 保單起期 | DATE | Policy start date | 2024-01-15 |

### Expected Data Volume
- Total records: **68,762 policies**
- Districts: **18** (Hong Kong administrative districts)
- Years: **2021-2024** (4 years)
- Occupancy types: **6** (住宅, 商業, 工業, 辦公室, 倉庫, 其他)
- Construction grades: **4** (I級, II級, III級, IV級)

---

## Performance Optimization

### Recommended Indexes

```sql
-- Connect to database
psql -U postgres -d natcat_platform

-- Create indexes for better query performance
CREATE INDEX idx_policies_district ON portfolio.policies(分區);
CREATE INDEX idx_policies_start_date ON portfolio.policies(保單起期);
CREATE INDEX idx_policies_occupancy ON portfolio.policies(經營性質);
CREATE INDEX idx_policies_construction ON portfolio.policies(建築等級);

-- Verify indexes
\di portfolio.*
```

**Expected Performance**:
- Before indexes: ~2-5 seconds per query
- After indexes: ~200-500ms per query

### Query Performance Testing

```sql
-- Test district aggregation query
EXPLAIN ANALYZE
SELECT
    分區 as district,
    COUNT(*) as policy_count,
    SUM(公司保額) as total_exposure,
    AVG(公司保額) as avg_exposure
FROM portfolio.policies
WHERE EXTRACT(YEAR FROM 保單起期) = 2024
GROUP BY 分區
ORDER BY total_exposure DESC;
```

---

## Security Best Practices

### Option 1: Environment Variables (Recommended)

**Create `.env` file** in project root:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
```

**Update Python script** to use environment variables:
```python
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}
```

**Install python-dotenv**:
```bash
conda activate base
pip install python-dotenv
```

### Option 2: PostgreSQL .pgpass File

**Create file**: `C:\Users\sichen\AppData\Roaming\postgresql\pgpass.conf`

**Format**:
```
localhost:5432:natcat_platform:postgres:your_password_here
```

**Set permissions** (Windows):
- Right-click file → Properties → Security
- Remove all users except current user
- Grant current user full control only

---

## Data Loading Reference

If you need to reload the portfolio data:

```python
# Example: Load data from Excel to PostgreSQL
import pandas as pd
import psycopg2
from sqlalchemy import create_engine

# Read Excel file
df = pd.read_excel('path/to/portfolio_data.xlsx')

# Create database connection
engine = create_engine('postgresql://postgres:password@localhost:5432/natcat_platform')

# Load to database
df.to_sql('policies', engine, schema='portfolio', if_exists='replace', index=False)

print(f"Loaded {len(df):,} records to portfolio.policies")
```

---

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] PostgreSQL service is running
- [ ] Database `natcat_platform` exists
- [ ] Schema `portfolio` exists
- [ ] Table `portfolio.policies` exists
- [ ] Table contains ~68,762 records
- [ ] Database password is correct in Python script
- [ ] Python script runs successfully: `python portfolio_analytics.py --dimension district`
- [ ] Python script returns JSON output (not error)
- [ ] API endpoint returns database data: http://10.253.22.15:3004/api/portfolio/statistics?dimension=district
- [ ] UI Statistics tab shows data
- [ ] Metadata shows `"dataSource": "postgresql"`
- [ ] All 4 dimension tabs work (District, Year, Occupancy, Construction)

---

## Quick Test Commands

```bash
# 1. Check PostgreSQL status
sc query postgresql-x64-15

# 2. Test database connection
psql -U postgres -d natcat_platform -c "SELECT COUNT(*) FROM portfolio.policies;"

# 3. Test Python script
cd "D:\Nat Cat Platform\scripts\portfolio_management\analytics"
"C:\Users\sichen\AppData\Local\anaconda3\python.exe" portfolio_analytics.py --dimension district --output json

# 4. Test API endpoint (in browser)
# http://10.253.22.15:3004/api/portfolio/statistics?dimension=district

# 5. Check UI
# http://10.253.22.15:3004 → Portfolio Management → Analytics → Statistics
```

---

## Common Issues and Solutions

### Issue: Mock data still appears after password fix

**Cause**: Next.js dev server needs restart to reload API route

**Solution**:
```bash
# Stop dev server (Ctrl+C in terminal)
# Restart dev server
npm run dev
```

### Issue: Python script works but API still fails

**Cause**: Path mismatch between development and production

**Solution**: Check paths in `route.ts`:
```typescript
// Verify these paths exist:
const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';
const ANALYTICS_SCRIPT = path.join(process.cwd(), '..', 'scripts', 'portfolio_management', 'analytics', 'portfolio_analytics.py');

// Test in terminal:
console.log(ANALYTICS_SCRIPT);
// Should output: D:\Nat Cat Platform\scripts\portfolio_management\analytics\portfolio_analytics.py
```

### Issue: Slow query performance (>2 seconds)

**Cause**: Missing database indexes

**Solution**: Run the index creation SQL from "Performance Optimization" section above

---

## Support

If you encounter issues not covered here:

1. Check Python script error output:
   ```bash
   python portfolio_analytics.py --dimension district 2>&1 | more
   ```

2. Check Next.js console logs (where `npm run dev` is running)

3. Check browser console (F12 → Console tab)

4. Verify database connectivity:
   ```bash
   psql -U postgres -d natcat_platform
   ```

---

**Last Updated**: 2025-12-15
**Status**: Ready for configuration
