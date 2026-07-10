@echo off
chcp 65001 >nul

echo ========================================
echo Portfolio Management Environment Check
echo ========================================
echo.

echo Checking environment...
echo.

REM Check PostgreSQL
echo [1/5] Checking PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL is installed
    psql --version
) else (
    echo [WARNING] psql command not found
    echo Please add PostgreSQL bin directory to PATH
    echo Usually located at: C:\Program Files\PostgreSQL\18\bin
)
echo.

REM Check Python/Anaconda
echo [2/5] Checking Python environment...
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python is installed
    python --version
) else (
    echo [ERROR] Python not found
)

where conda >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Anaconda is installed
    conda --version
) else (
    echo [WARNING] Conda not found (OK if using standalone Python)
)
echo.

REM Check if database is running
echo [3/5] Checking PostgreSQL service status...
sc query postgresql-x64-18 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL service is running
) else (
    sc query postgresql-18 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] PostgreSQL service is running
    ) else (
        echo [WARNING] PostgreSQL service may not be running
        echo Please start PostgreSQL service in Windows Services
    )
)
echo.

REM Check .env file
echo [4/5] Checking configuration file...
cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
if exist ".env" (
    echo [OK] .env file exists
    findstr /C:"DB_PASSWORD=your_postgres_password_here" .env >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Database password is configured
    ) else (
        echo [WARNING] Please check database password in .env file
    )
) else (
    echo [ERROR] .env file does not exist
    echo Please copy .env.example and rename to .env
)
echo.

REM Check data files
echo [5/5] Checking data files...
if exist "D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-承保信息 (香港地區).xlsx" (
    echo [OK] TPHK policy data file exists
) else (
    echo [ERROR] TPHK policy data file not found
)
echo.

echo ========================================
echo Environment Check Complete
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Install Python dependencies:
echo    pip install -r requirements.txt
echo.
echo 2. Test database connection:
echo    python database\init_db.py
echo.
echo 3. Run test pipeline (100 records):
echo    run-test-pipeline.bat
echo.
pause
