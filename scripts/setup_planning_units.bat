@echo off
REM Setup Planning Units - Add TPU/PPU/SPU columns to database
REM
REM Usage:
REM   1. Run this script
REM   2. Enter your PostgreSQL password when prompted

echo ====================================
echo Setup Planning Units for Portfolio
echo ====================================
echo.

set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d natcat_platform -f "UI_system\scripts\portfolio_management\database\add_planning_units.sql"

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo SUCCESS! Planning unit columns added
    echo ====================================
    echo.
    echo Next steps:
    echo 1. Import shapefiles to PostGIS
    echo 2. Run spatial join to populate TPU/PPU/SPU fields
    echo.
) else (
    echo.
    echo ====================================
    echo ERROR! Check the error message above
    echo ====================================
    echo.
)

pause
