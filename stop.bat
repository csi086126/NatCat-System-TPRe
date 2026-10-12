@echo off
REM ===========================================================
REM  Nat Cat Platform — 一键停止脚本
REM  关闭 8000(FastAPI)和 3004(Next.js)端口的进程
REM ===========================================================

setlocal
cd /d "%~dp0"

echo.
echo === 停止 Nat Cat Platform 服务 ===
echo.

REM --- 关闭 3004 (Next.js) ---
set "FOUND_NEXT=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :3004 ^| findstr LISTENING') do (
    if not "%%P"=="0" (
        echo 停 Next.js   (port 3004, PID %%P) ...
        taskkill /PID %%P /F >nul 2>&1
        set "FOUND_NEXT=1"
    )
)
if "%FOUND_NEXT%"=="0" echo Next.js 未运行。

REM --- 关闭 8000 (FastAPI) ---
set "FOUND_API=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    if not "%%P"=="0" (
        echo 停 FastAPI  (port 8000, PID %%P) ...
        taskkill /PID %%P /F >nul 2>&1
        set "FOUND_API=1"
    )
)
if "%FOUND_API%"=="0" echo FastAPI 未运行。

echo.
echo 完成。
timeout /t 2 /nobreak >nul