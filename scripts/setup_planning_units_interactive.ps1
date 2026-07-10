# Setup Planning Units for Portfolio Analysis (Interactive)
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

# Ask for password securely
Write-Host "Enter PostgreSQL password for user 'postgres':" -ForegroundColor Yellow
$SecurePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variable for password
$env:PGPASSWORD = $PGPASSWORD

# PostgreSQL bin path
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# SQL script path (use absolute path)
$SQLSCRIPT = Join-Path (Get-Location) "UI_system\scripts\portfolio_management\database\add_planning_units.sql"

Write-Host ""
Write-Host "Connecting to database: $PGDATABASE" -ForegroundColor Yellow
Write-Host "Running SQL script..." -ForegroundColor Yellow
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
        Write-Host "The following columns have been added to portfolio.policies table:" -ForegroundColor White
        Write-Host "  - TPU (Tertiary Planning Unit)" -ForegroundColor Cyan
        Write-Host "  - PPU (Primary Planning Unit)" -ForegroundColor Cyan
        Write-Host "  - SPU (Secondary Planning Unit)" -ForegroundColor Cyan
        Write-Host "  - SUBUNIT" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Import shapefiles to PostGIS using QGIS or shp2pgsql" -ForegroundColor White
        Write-Host "2. Run spatial join to populate the planning unit fields" -ForegroundColor White
        Write-Host "3. See docs/PORTFOLIO_ANALYSIS_SETUP.md for details" -ForegroundColor White
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
    Write-Host "2. Verify password is correct" -ForegroundColor White
    Write-Host "3. Verify database exists: $PGDATABASE" -ForegroundColor White
    Write-Host "4. Check PostgreSQL logs for more details" -ForegroundColor White
    Write-Host ""
    exit 1
} finally {
    # Clear password from environment
    if (Test-Path Env:\PGPASSWORD) {
        Remove-Item Env:\PGPASSWORD
    }
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
