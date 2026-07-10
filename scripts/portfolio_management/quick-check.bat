@echo off
echo ========================================
echo Quick Environment Check
echo ========================================
echo.

REM Check if PostgreSQL bin exists
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    echo [OK] PostgreSQL 18 found at: C:\Program Files\PostgreSQL\18\bin\
) else (
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
        echo [OK] PostgreSQL 17 found at: C:\Program Files\PostgreSQL\17\bin\
    ) else (
        if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
            echo [OK] PostgreSQL 16 found at: C:\Program Files\PostgreSQL\16\bin\
        ) else (
            echo [ERROR] PostgreSQL not found in standard location
        )
    )
)

echo.
echo [INFO] Checking if PostgreSQL is in PATH...
where psql 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] psql is in PATH
) else (
    echo [WARNING] psql is NOT in PATH
    echo You need to add PostgreSQL bin directory to PATH
)

echo.
echo [INFO] Checking Python...
where python 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python found
    python --version
) else (
    echo [ERROR] Python not found in PATH
)

echo.
echo [INFO] Checking Anaconda...
where conda 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Conda found
    conda --version
) else (
    echo [INFO] Conda not in PATH (this is OK if using standalone Python)
)

echo.
echo ========================================
echo Press any key to continue...
pause >nul
