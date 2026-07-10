@echo off
chcp 65001 >nul

echo ========================================
echo Portfolio Management - Complete Pipeline
echo ========================================
echo.
echo This will execute the complete data processing pipeline:
echo   1. Initialize PostgreSQL database
echo   2. Geocode all TPHK data (~40,000 records)
echo   3. Load data into database
echo   4. Calculate zone accumulations
echo   5. Generate GeoJSON files for frontend
echo.
echo WARNING: This process may take 2-4 hours!
echo Make sure PostgreSQL is running before continuing.
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
echo Step 2/5: Geocode TPHK Data
echo ========================================
echo This will geocode all ~40,000 records...
echo Press Ctrl+C to cancel, or
pause
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
echo ✅ Complete Pipeline Finished Successfully!
echo ========================================
echo.
echo All data files are ready in:
echo   D:\Nat Cat Platform\UI_system\public\data\
echo.
echo Next steps:
echo   1. Start API server: run-api.bat
echo   2. Start frontend: npm run dev (in UI_system folder)
echo.
pause
