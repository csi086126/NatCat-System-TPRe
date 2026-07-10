# 快速创建和激活Python虚拟环境
# 使用方法: 在PowerShell中右键运行此脚本

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Python虚拟环境快速创建工具" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$envName = "geo_env"
$projectPath = "d:\Nat Cat Platform\UI_system"

# 切换到项目目录
Set-Location $projectPath
Write-Host "当前目录: $projectPath" -ForegroundColor Green
Write-Host ""

# 检查Python
Write-Host "[1/5] 检查Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ Python版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 未找到Python,请先安装Python" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 检查虚拟环境是否已存在
if (Test-Path $envName) {
    Write-Host "[2/5] 虚拟环境已存在" -ForegroundColor Green
    Write-Host "  位置: $projectPath\$envName" -ForegroundColor Gray
} else {
    Write-Host "[2/5] 创建虚拟环境..." -ForegroundColor Yellow
    python -m venv $envName

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ 虚拟环境创建成功" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 创建失败" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 设置执行策略
Write-Host "[3/5] 设置执行策略..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Write-Host "  ✓ 执行策略已设置" -ForegroundColor Green
Write-Host ""

# 激活虚拟环境
Write-Host "[4/5] 激活虚拟环境..." -ForegroundColor Yellow
& ".\$envName\Scripts\Activate.ps1"

if ($?) {
    Write-Host "  ✓ 虚拟环境已激活" -ForegroundColor Green
} else {
    Write-Host "  ✗ 激活失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 检查是否需要安装包
Write-Host "[5/5] 检查已安装的包..." -ForegroundColor Yellow
$pipList = pip list 2>&1 | Out-String

if ($pipList -match "pyshp") {
    Write-Host "  ✓ pyshp 已安装" -ForegroundColor Green
} else {
    Write-Host "  ℹ pyshp 未安装" -ForegroundColor Gray
    $install = Read-Host "是否现在安装? (y/n)"
    if ($install -eq "y") {
        Write-Host "    安装中..." -ForegroundColor Yellow
        pip install pyshp python-dotenv requests
        Write-Host "    ✓ 安装完成" -ForegroundColor Green
    }
}
Write-Host ""

# 完成
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ✨ 环境准备完成!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "可用命令:" -ForegroundColor Cyan
Write-Host "  python split-tpusu-simple.py     # 运行TPUSU分割脚本" -ForegroundColor Gray
Write-Host "  pip list                          # 查看已安装的包" -ForegroundColor Gray
Write-Host "  deactivate                        # 退出虚拟环境" -ForegroundColor Gray
Write-Host ""
Write-Host "提示: 下次直接运行以下命令激活环境:" -ForegroundColor Yellow
Write-Host "  .\geo_env\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
