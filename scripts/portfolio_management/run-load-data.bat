@echo off
chcp 65001 >nul
echo ======================================================================
echo TPHK Portfolio Data Import to PostgreSQL
echo ======================================================================
echo.

REM 检测Anaconda Python
set PYTHON_PATH=C:\Users\sichen\AppData\Local\anaconda3\python.exe

if not exist "%PYTHON_PATH%" (
    echo Error: Python not found at %PYTHON_PATH%
    echo Please update PYTHON_PATH in this script
    pause
    exit /b 1
)

REM 检查.env文件
if not exist .env (
    echo Warning: .env file not found
    echo Creating .env template...
    echo DB_HOST=localhost > .env
    echo DB_PORT=5432 >> .env
    echo DB_NAME=natcat_platform >> .env
    echo DB_USER=postgres >> .env
    echo DB_PASSWORD=postgres >> .env
    echo.
    echo Please edit .env file with your database credentials
    pause
    exit /b 1
)

echo Using Python: %PYTHON_PATH%
echo.

REM 运行导入脚本
"%PYTHON_PATH%" database/load_data.py

echo.
echo ======================================================================
pause
