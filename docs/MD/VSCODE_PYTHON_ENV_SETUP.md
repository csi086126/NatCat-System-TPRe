# VSCode Python虚拟环境配置指南

## 📋 目的
在VSCode中创建独立的Python虚拟环境 `geo_env`，用于安装地理空间数据处理包，避免污染全局Python环境。

---

## 🚀 方法1: 使用VSCode命令面板 (推荐)

### 步骤1: 打开命令面板
```
按键: Ctrl + Shift + P (Windows/Linux)
     Cmd + Shift + P  (Mac)
```

### 步骤2: 创建虚拟环境
1. 输入: `Python: Create Environment`
2. 选择: `Venv` (虚拟环境)
3. 选择Python解释器 (通常是最新版本)
4. 输入环境名称: `geo_env`
5. 等待创建完成

### 步骤3: 激活环境
VSCode会自动激活新创建的环境。你会在终端看到:
```
(geo_env) PS D:\Nat Cat Platform\UI_system>
```

---

## 🚀 方法2: 使用VSCode集成终端

### 步骤1: 打开集成终端
```
按键: Ctrl + ` (反引号)
或: View → Terminal
```

### 步骤2: 创建虚拟环境
在终端中输入:

**Windows (PowerShell)**:
```powershell
# 进入项目目录
cd "d:\Nat Cat Platform\UI_system"

# 创建虚拟环境
python -m venv geo_env

# 或使用 py launcher
py -m venv geo_env
```

**Windows (CMD)**:
```cmd
cd /d "d:\Nat Cat Platform\UI_system"
python -m venv geo_env
```

### 步骤3: 激活虚拟环境

**Windows (PowerShell)**:
```powershell
.\geo_env\Scripts\Activate.ps1
```

如果出现权限错误:
```powershell
# 临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 然后再激活
.\geo_env\Scripts\Activate.ps1
```

**Windows (CMD)**:
```cmd
geo_env\Scripts\activate.bat
```

**激活成功标志**: 终端前面会出现 `(geo_env)`
```
(geo_env) PS D:\Nat Cat Platform\UI_system>
```

---

## 📦 方法3: 手动步骤 (完整流程)

### 1. 打开VSCode
```
File → Open Folder → 选择 "d:\Nat Cat Platform\UI_system"
```

### 2. 打开PowerShell终端
```
Terminal → New Terminal
确保选择 PowerShell (不是Git Bash)
```

### 3. 创建虚拟环境
```powershell
# 检查Python是否可用
python --version
# 或
py --version

# 创建虚拟环境
python -m venv geo_env
```

### 4. 激活虚拟环境
```powershell
# 设置执行策略(如果需要)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 激活环境
.\geo_env\Scripts\Activate.ps1
```

### 5. 升级pip
```powershell
python -m pip install --upgrade pip
```

### 6. 安装依赖包
```powershell
# 方案A: 轻量级(推荐先试这个)
pip install pyshp python-dotenv requests

# 方案B: 完整版(需要更多时间)
pip install geopandas python-dotenv requests

# 或从requirements.txt安装
pip install -r requirements.txt
```

---

## 🔧 配置VSCode使用虚拟环境

### 方法A: 通过命令面板
1. `Ctrl + Shift + P`
2. 输入: `Python: Select Interpreter`
3. 选择: `.\geo_env\Scripts\python.exe`

### 方法B: 手动配置settings.json
1. 打开设置: `Ctrl + ,`
2. 点击右上角图标 "Open Settings (JSON)"
3. 添加:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/geo_env/Scripts/python.exe",
  "python.terminal.activateEnvironment": true
}
```

### 方法C: 创建.vscode/settings.json
在项目根目录创建 `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/geo_env/Scripts/python.exe",
  "python.terminal.activateEnvironment": true,
  "python.analysis.extraPaths": [
    "${workspaceFolder}/geo_env/Lib/site-packages"
  ]
}
```

---

## ✅ 验证环境配置

### 1. 检查Python路径
```powershell
(geo_env) PS> python -c "import sys; print(sys.executable)"
# 应该显示: d:\Nat Cat Platform\UI_system\geo_env\Scripts\python.exe
```

### 2. 检查已安装的包
```powershell
(geo_env) PS> pip list
```

### 3. 测试导入
```powershell
(geo_env) PS> python -c "import shapefile; print('pyshp OK')"
(geo_env) PS> python -c "import dotenv; print('python-dotenv OK')"
```

### 4. 运行脚本
```powershell
(geo_env) PS> python split-tpusu-simple.py
```

---

## 📦 安装地理空间处理包

### 轻量级方案 (pyshp)
```powershell
# 激活环境后
(geo_env) PS> pip install pyshp python-dotenv requests

# 验证
(geo_env) PS> python -c "import shapefile; print(shapefile.__version__)"
```

### 完整方案 (geopandas)

**使用pip (可能失败)**:
```powershell
(geo_env) PS> pip install geopandas
```

**如果失败,使用conda** (推荐):
```powershell
# 1. 安装Miniconda
# 下载: https://docs.conda.io/en/latest/miniconda.html

# 2. 创建conda环境
conda create -n geo_env python=3.11
conda activate geo_env

# 3. 安装geopandas
conda install -c conda-forge geopandas

# 4. 安装其他包
pip install python-dotenv requests
```

**使用预编译wheel文件**:
```powershell
# 1. 下载wheel文件
# https://www.lfd.uci.edu/~gohlke/pythonlibs/

# 2. 安装依赖顺序
pip install GDAL-xxx-cp311-cp311-win_amd64.whl
pip install Fiona-xxx-cp311-cp311-win_amd64.whl
pip install shapely-xxx-cp311-cp311-win_amd64.whl
pip install pyproj-xxx-cp311-cp311-win_amd64.whl
pip install geopandas
```

---

## 🐛 常见问题

### Q1: PowerShell不允许运行脚本
**错误**: `无法加载文件 Activate.ps1，因为在此系统上禁止运行脚本`

**解决方案**:
```powershell
# 临时允许
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 然后激活
.\geo_env\Scripts\Activate.ps1
```

### Q2: VSCode没有自动激活虚拟环境
**解决方案**:
1. 关闭所有终端: `Terminal → Kill All Terminals`
2. 重新选择解释器: `Ctrl+Shift+P` → `Python: Select Interpreter`
3. 选择 `geo_env` 环境
4. 打开新终端: `Ctrl+`\`

### Q3: pip安装很慢
**解决方案**:
```powershell
# 使用国内镜像
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple pyshp
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple python-dotenv
```

### Q4: 找不到python命令
**解决方案**:
```powershell
# 使用py launcher
py -m venv geo_env
py -m pip install pyshp
```

### Q5: geopandas安装失败
**解决方案**:
```powershell
# 改用轻量级方案
pip install pyshp

# 使用简化版脚本
python split-tpusu-simple.py
```

---

## 📁 项目结构(虚拟环境创建后)

```
d:\Nat Cat Platform\UI_system\
├── geo_env\                    ← 虚拟环境目录
│   ├── Scripts\
│   │   ├── python.exe         ← Python解释器
│   │   ├── pip.exe            ← pip包管理器
│   │   ├── Activate.ps1       ← PowerShell激活脚本
│   │   └── activate.bat       ← CMD激活脚本
│   └── Lib\
│       └── site-packages\     ← 安装的包
├── .vscode\
│   └── settings.json          ← VSCode配置
├── requirements.txt           ← 依赖列表
├── split-tpusu-simple.py      ← 脚本
└── ...
```

---

## 🎯 快速命令参考

### 创建环境
```powershell
python -m venv geo_env
```

### 激活环境
```powershell
# PowerShell
.\geo_env\Scripts\Activate.ps1

# CMD
geo_env\Scripts\activate.bat
```

### 停用环境
```powershell
deactivate
```

### 删除环境
```powershell
# 先停用,然后删除文件夹
deactivate
Remove-Item -Recurse -Force geo_env
```

### 安装包
```powershell
# 单个包
pip install pyshp

# 从requirements.txt
pip install -r requirements.txt

# 升级包
pip install --upgrade pyshp
```

### 导出依赖
```powershell
pip freeze > requirements.txt
```

---

## 🎬 完整操作演示

```powershell
# 1. 进入项目目录
cd "d:\Nat Cat Platform\UI_system"

# 2. 创建虚拟环境
python -m venv geo_env

# 3. 激活环境
.\geo_env\Scripts\Activate.ps1

# 4. 升级pip
(geo_env) PS> python -m pip install --upgrade pip

# 5. 安装依赖
(geo_env) PS> pip install pyshp python-dotenv requests

# 6. 验证安装
(geo_env) PS> pip list

# 7. 运行脚本
(geo_env) PS> python split-tpusu-simple.py

# 8. 完成后停用
(geo_env) PS> deactivate
```

---

## 💡 最佳实践

1. **每个项目一个环境**: 避免依赖冲突
2. **使用requirements.txt**: 记录依赖版本
3. **添加到.gitignore**: 不提交虚拟环境
4. **定期更新包**: `pip install --upgrade`
5. **使用虚拟环境运行脚本**: 确保一致性

---

## 📞 需要帮助?

遇到问题时:
1. 检查Python版本: `python --version` (建议 3.8+)
2. 检查pip版本: `pip --version`
3. 查看错误日志
4. 尝试使用 `py -m` 代替 `python -m`
5. 考虑使用conda代替venv

---

**下一步**: 按照上述步骤创建环境后，运行:
```powershell
python split-tpusu-simple.py
```

**最后更新**: 2025-12-19
