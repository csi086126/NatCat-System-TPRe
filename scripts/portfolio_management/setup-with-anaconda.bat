@echo off
title Portfolio Management Setup
color 0A

echo ========================================
echo Portfolio Management - Anaconda Setup
echo ========================================
echo.

REM Try to find and activate Anaconda
echo [1/3] Looking for Anaconda installation...

set ANACONDA_FOUND=0

if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\anaconda3
    set ANACONDA_FOUND=1
    echo [OK] Found at: %USERPROFILE%\anaconda3
)

if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\Anaconda3
    set ANACONDA_FOUND=1
    echo [OK] Found at: %USERPROFILE%\Anaconda3
)

if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=C:\ProgramData\Anaconda3
    set ANACONDA_FOUND=1
    echo [OK] Found at: C:\ProgramData\Anaconda3
)

if exist "C:\Users\%USERNAME%\AppData\Local\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=C:\Users\%USERNAME%\AppData\Local\anaconda3
    set ANACONDA_FOUND=1
    echo [OK] Found at: C:\Users\%USERNAME%\AppData\Local\anaconda3
)

if %ANACONDA_FOUND%==0 (
    echo [ERROR] Anaconda not found in standard locations!
    echo.
    echo Please check where Anaconda is installed on your system.
    echo Common locations:
    echo   - %USERPROFILE%\anaconda3
    echo   - C:\ProgramData\Anaconda3
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Activating Anaconda base environment...
call "%ANACONDA_PATH%\Scripts\activate.bat" base

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to activate Anaconda!
    pause
    exit /b 1
)

echo [OK] Anaconda activated
echo.

echo [3/3] Checking Python version...
python --version
echo.

echo ========================================
echo Environment Ready!
echo ========================================
echo.
echo Anaconda Path: %ANACONDA_PATH%
echo.
echo Next steps:
echo   1. Install dependencies: pip install -r requirements.txt
echo   2. Initialize database: python database\init_db.py
echo   3. Run test: run-test-pipeline.bat
echo.
echo This window will stay open for you to work.
echo.

REM Stay in the portfolio_management directory
cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

REM Keep the activated environment open
cmd /k
