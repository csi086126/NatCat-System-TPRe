# Setup Planning Units for Portfolio Analysis
# Adds TPU, PPU, SPU, SUBUNIT columns to the policies table

$ErrorActionPreference = "Stop"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Setup Planning Units for Portfolio" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# PostgreSQL connection settings
$PGHOST = "localhost"
$PGPORT = "5432"
$PGDATABASE = "natcat_platform"
$PGUSER = "postgres"
$PGPASSWORD = "postgres"  # Change this if your password is different

# Set environment variable for password
$env:PGPASSWORD = $PGPASSWORD

# PostgreSQL bin path
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# SQL script path
$SQLSCRIPT = "UI_system\scripts\portfolio_management\database\add_planning_units.sql"

Write-Host "Connecting to database: $PGDATABASE" -ForegroundColor Yellow
Write-Host "Running SQL script: $SQLSCRIPT" -ForegroundColor Yellow
Write-Host ""

try {
    # Run the SQL script
    & $PSQL -U $PGUSER -d $PGDATABASE -f $SQLSCRIPT

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "====================================" -ForegroundColor Green
        Write-Host "SUCCESS! Planning unit columns added" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Import shapefiles to PostGIS (see documentation)" -ForegroundColor White
        Write-Host "2. Run spatial join to populate TPU/PPU/SPU fields" -ForegroundColor White
        Write-Host ""
    } else {
        throw "psql command failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Red
    Write-Host "ERROR! $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if PostgreSQL is running" -ForegroundColor White
    Write-Host "2. Verify database name: $PGDATABASE" -ForegroundColor White
    Write-Host "3. Update password in this script if needed" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD
