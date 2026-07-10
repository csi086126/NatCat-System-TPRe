@echo off
chcp 65001 >nul

echo ========================================
echo Resume Geocoding - Optimized Version
echo ========================================
echo.
echo This will resume from record 237,100
echo and use optimized checkpoint strategy:
echo  - Saves every 1000 records (not 100)
echo  - Only keeps latest checkpoint
echo  - No cumulative files
echo.
echo Remaining: ~237,000 records
echo Estimated time: 1-2 hours
echo.
echo Press Ctrl+C to cancel...
timeout /t 5
echo.

REM Find Anaconda
set ANACONDA_FOUND=0

if exist "%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\AppData\Local\anaconda3
    set ANACONDA_FOUND=1
)
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
echo Starting optimized resume...
echo.

python data_processing\resume_geocoding_v2.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Resume failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Resume Completed Successfully!
echo ========================================
echo.
echo Next steps:
echo   1. Check output\tphk-geocoded-full.json
echo   2. Run: run-complete-pipeline-fixed.bat
echo.
pause
