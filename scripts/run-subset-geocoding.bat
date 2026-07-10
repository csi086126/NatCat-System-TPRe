@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Portfolio - Subset Geocoding (5000 records)
echo ========================================
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

echo Starting subset geocoding...
python geocode_tphk_subset.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Data saved to public/data/tphk_portfolio_subset_5000.json
) else (
    echo.
    echo Error occurred during geocoding.
)
