@echo off
chcp 65001 >nul

echo ========================================
echo 清理无用文件
echo ========================================
echo.
echo 将删除以下文件：
echo.
echo [临时文件]
echo   - 旧版geocoding脚本
echo   - 测试脚本
echo   - 日志文件（保留最新）
echo   - checkpoint文件（已完成）
echo.
echo [保留文件]
echo   ✓ tphk-geocoded-full.json (最终结果)
echo   ✓ tphk-geocoding-cache.json (缓存)
echo   ✓ resume_geocoding_v2.py (核心脚本)
echo   ✓ 数据库相关脚本
echo.
echo 按任意键继续，或 Ctrl+C 取消...
pause >nul

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

echo.
echo [1/4] 删除旧版geocoding脚本...
del /Q data_processing\01_geocode_full.py 2>nul
del /Q data_processing\resume_geocoding.py 2>nul
echo ✓ 已删除:
echo   - 01_geocode_full.py (原始版，有磁盘空间问题)
echo   - resume_geocoding.py (中间版，checkpoint硬编码)

echo.
echo [2/4] 删除测试和检查脚本...
del /Q check-environment.bat 2>nul
del /Q check-env-stay-open.bat 2>nul
del /Q quick-check.bat 2>nul
del /Q run-test-pipeline.bat 2>nul
del /Q run-test-pipeline-fixed.bat 2>nul
del /Q run-complete-pipeline.bat 2>nul
del /Q run-complete-pipeline-fixed.bat 2>nul
del /Q setup-with-anaconda.bat 2>nul
echo ✓ 完成

echo.
echo [3/4] 删除旧日志文件...
del /Q 01_geocode_full.log 2>nul
del /Q resume_geocoding.log 2>nul
echo ✓ 完成 (保留 resume_geocoding_v2.log 和 geocoding_failures.log)

echo.
echo [4/4] 清理output目录中的临时文件...
cd output
del /Q tphk-geocoding-checkpoint_474000.json 2>nul
del /Q tphk-geocoded-full.csv 2>nul
echo ✓ 完成

cd ..

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 保留的重要文件：
dir /B output\tphk-geocoded-full.json 2>nul
dir /B output\tphk-geocoding-cache.json 2>nul
echo.
echo 保留的脚本：
dir /B data_processing\resume_geocoding_v2.py 2>nul
dir /B run-resume-geocoding-v2.bat 2>nul
dir /B analyze_geocoding_results.py 2>nul
echo.

pause
