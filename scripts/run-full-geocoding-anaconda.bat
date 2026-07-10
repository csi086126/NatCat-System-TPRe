@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Portfolio - Full Geocoding
echo ========================================
echo.
echo This will process ALL addresses from your TPHK data.
echo.
echo Estimated:
echo   - Addresses: 1,000 - 3,000 unique addresses
echo   - Time: 10-30 minutes
echo   - Cost: FREE (within Google's free tier)
echo.
echo The script will:
echo   1. Read Excel files (policy + claim data)
echo   2. Extract unique addresses
echo   3. Geocode using Google Maps (with Amap fallback)
echo   4. Generate GeoJSON for map visualization
echo   5. Create summary report
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
cd /d "D:\Nat Cat Platform\UI_system\scripts"

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

echo Starting full geocoding...
echo.
echo ========================================
echo.

python geocode-tphk-portfolio.py

echo.
echo ========================================
echo Processing complete!
echo ========================================
echo.
echo Output files saved to:
echo D:\Nat Cat Platform\UI_system\public\data\
echo.
echo Files created:
echo   - tphk-portfolio.geojson (for map visualization)
echo   - tphk-geocoded-portfolio.json (complete results)
echo   - tphk-geocoding-cache.json (cache for future runs)
echo   - TPHK_GEOCODING_REPORT.md (summary report)
echo.
echo Check the report for statistics and next steps!
echo.
pause
