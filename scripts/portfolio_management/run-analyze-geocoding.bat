@echo off
chcp 65001 >nul

echo ========================================
echo 分析 Geocoding 结果
echo ========================================
echo.

call "C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat" base

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

python analyze_geocoding_results.py

pause
