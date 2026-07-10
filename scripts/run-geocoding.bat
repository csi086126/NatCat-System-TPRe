@echo off
REM Full geocoding script for TPHK portfolio

echo ========================================
echo TPHK Portfolio Geocoding - Full Run
echo ========================================
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts"

echo WARNING: This will process all addresses in your TPHK data.
echo Make sure you have configured your API keys in .env file.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting full geocoding...
echo This may take 10-30 minutes depending on data size.
echo.

python geocode-tphk-portfolio.py

echo.
echo ========================================
echo Geocoding Complete!
echo ========================================
echo.
echo Output files saved to:
echo D:\Nat Cat Platform\UI_system\public\data\
echo.
echo - tphk-portfolio.geojson (for map visualization)
echo - tphk-geocoded-portfolio.json (raw results)
echo - TPHK_GEOCODING_REPORT.md (summary report)
echo.
pause
