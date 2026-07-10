@echo off
REM Quick test script for TPHK geocoding

echo ========================================
echo TPHK Portfolio Geocoding - Test Mode
echo ========================================
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts"

echo Running geocoding test...
python geocode-tphk-portfolio.py --test

echo.
echo Test complete! Check the output above.
echo.
echo Next steps:
echo 1. If test passed, run full geocoding:
echo    python geocode-tphk-portfolio.py
echo.
echo 2. Check output files in:
echo    D:\Nat Cat Platform\UI_system\public\data\
echo.
pause
