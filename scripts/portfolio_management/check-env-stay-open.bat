@echo off
title Portfolio Management - Environment Check
color 0A

:start
cls
echo ========================================
echo Environment Check Results
echo ========================================
echo.

echo [1] PostgreSQL Location Check:
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    echo    [OK] Found at: C:\Program Files\PostgreSQL\18\bin\
) else (
    echo    [NOT FOUND] PostgreSQL 18 not in standard location
)
echo.

echo [2] PostgreSQL in PATH:
where psql >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    [OK] psql is accessible
    psql --version 2>nul
) else (
    echo    [WARNING] psql NOT in PATH
    echo    You need to add: C:\Program Files\PostgreSQL\18\bin to PATH
)
echo.

echo [3] Python Check:
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Python is available
    python --version 2>nul
) else (
    echo    [ERROR] Python not found
)
echo.

echo [4] Anaconda Check:
where conda >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Conda is available
    conda --version 2>nul
) else (
    echo    [INFO] Conda not in PATH (OK if using Python directly)
)
echo.

echo [5] .env Configuration:
cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
if exist ".env" (
    echo    [OK] .env file exists
) else (
    echo    [ERROR] .env file missing
)
echo.

echo [6] Data File:
if exist "D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-承保信息 (香港地區).xlsx" (
    echo    [OK] TPHK data file exists
) else (
    echo    [ERROR] Data file not found
)
echo.

echo ========================================
echo.
echo This window will stay open.
echo Take a screenshot now, then close this window.
echo.
echo ========================================

REM Keep window open indefinitely
cmd /k
