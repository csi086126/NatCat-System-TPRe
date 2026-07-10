@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Complete Pipeline with Anaconda
echo ========================================
echo.

REM Find Anaconda
set ANACONDA_FOUND=0

if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\anaconda3
    set ANACONDA_FOUND=1
)
if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\Anaconda3
    set ANACONDA_FOUND=1
)
if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=C:\ProgramData\Anaconda3
    set ANACONDA_FOUND=1
)

if %ANACONDA_FOUND%==0 (
    echo [ERROR] Anaconda not found!
    pause
    exit /b 1
)

echo Activating Anaconda...
call "%ANACONDA_PATH%\Scripts\activate.bat" base

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

echo.
echo ========================================
echo Step 1/5: Initialize Database
echo ========================================
python database\init_db.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database initialization failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Step 2/5: Geocode Data (ALL records)
echo ========================================
echo This will geocode 40,000+ records - takes 2-4 hours
echo Press Ctrl+C to cancel...
timeout /t 10
python data_processing\01_geocode_full.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Geocoding failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Step 3/5: Load to Database
echo ========================================
python data_processing\02_load_to_db.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Loading failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Step 4/5: Calculate Aggregations
echo ========================================
python data_processing\03_aggregate.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Aggregation failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Step 5/5: Generate GeoJSON
echo ========================================
python data_processing\04_generate_geojson.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] GeoJSON generation failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Pipeline Completed Successfully!
echo ========================================
echo.
pause
