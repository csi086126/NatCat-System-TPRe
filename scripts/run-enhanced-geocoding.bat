@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Enhanced Geocoding
echo 增强版地址编码（自动提取分区）
echo ========================================
echo.
echo 功能：
echo   - Geocode所有地址
echo   - 自动从Google API提取分区
echo   - 自动从地址文本匹配分区
echo   - 保存完整字段数据
echo.
echo 选择模式：
echo   1. 测试模式（10条记录）
echo   2. 限量模式（5000条记录）
echo   3. 完整模式（全部记录，约4万条）
echo.

set /p choice="请输入选择 (1/2/3): "

cd /d "D:\Nat Cat Platform\UI_system\scripts"

echo.
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

if "%choice%"=="1" (
    echo Running TEST mode (10 records)...
    python geocode-tphk-enhanced.py --test
) else if "%choice%"=="2" (
    echo Running LIMITED mode (5000 records)...
    echo This will take approximately 15-30 minutes...
    python geocode-tphk-enhanced.py --limit 5000
) else if "%choice%"=="3" (
    echo Running FULL mode (all records)...
    echo WARNING: This may take 2-4 hours!
    echo Press Ctrl+C to cancel, or
    pause
    python geocode-tphk-enhanced.py
) else (
    echo Invalid choice! Please run again and select 1, 2, or 3.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 处理完成！
echo ========================================
echo.
echo 输出文件位置:
echo D:\Nat Cat Platform\UI_system\public\data\
echo.
echo 文件:
echo   - tphk-portfolio-enhanced.json (完整数据)
echo   - tphk-portfolio-enhanced.csv (CSV格式)
echo   - tphk-geocoding-cache.json (缓存)
echo.
pause
