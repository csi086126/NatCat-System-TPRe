@echo off
chcp 65001 >nul

echo ========================================
echo Portfolio Management - Test Mode
echo ========================================
echo.
echo This will run the pipeline in TEST MODE:
echo   - Only 100 records will be geocoded
echo   - Quick test of all components
echo   - Takes about 5-10 minutes
echo.
pause

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

echo.
echo Activating Anaconda environment...
call conda activate base 2>nul

if %ERRORLEVEL% NEQ 0 (
    if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\anaconda3\Scripts\activate.bat" base
    ) else if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
        call "C:\ProgramData\Anaconda3\Scripts\activate.bat" base
    ) else if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\Anaconda3\Scripts\activate.bat" base
    )
)

echo [OK] Environment ready
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
echo Step 2/5: Geocode TPHK Data (TEST MODE - 100 records)
echo ========================================
python data_processing\01_geocode_full.py --test
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
    echo [ERROR] Database loading failed!
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
echo ✅ Test Pipeline Completed Successfully!
echo ========================================
echo.
echo Test data files are in:
echo   D:\Nat Cat Platform\UI_system\public\data\
echo.
echo To process full dataset, run:
echo   run-complete-pipeline.bat
echo.
pause
