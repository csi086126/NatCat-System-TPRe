@echo off
REM ============================================================
REM FastAPI launcher (called by start.bat)
REM Activates conda geo_env and runs FastAPI.
REM ============================================================

REM 把 scripts/portfolio_management 加进 PYTHONPATH,让 routes/reports.py 里的
REM `from pdf_service.area_report import ...` 这种绝对导入能找到 pdf_service 包。
REM (start.bat 从项目根目录运行,不加这一行的话 sys.path 里没有 portfolio_management)
set "PYTHONPATH=%~dp0portfolio_management;%PYTHONPATH%"

call "C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat" geo_env
python -m scripts.portfolio_management.api.main