# Fork OasisLMF 到 GitHub 并重命名为 TPRe 操作指南

> **准备时间：** 下周执行  
> **预计耗时：** 30-60 分钟  
> **目标：** 将 OasisLMF 系列仓库 Fork 到 `csi086126` 账号，统一重命名为 TPRe 系列

---

## 📋 目录

1. [需要 Fork 的仓库列表](#需要-fork-的仓库列表)
2. [GitHub 网页操作步骤](#github-网页操作步骤)
3. [本地克隆和重命名](#本地克隆和重命名)
4. [自动化脚本](#自动化脚本)
5. [验证清单](#验证清单)

---

## 🎯 需要 Fork 的仓库列表

| 原始仓库 | Fork 后的名称 | 分支 | 用途 |
|---------|--------------|------|------|
| `OasisLMF/OasisUI` | `csi086126/TPReUI` | `main` | 用户界面（Taiping 定制） |
| `OasisLMF/OasisPlatform` | `csi086126/TPRePlatform` | `stable/2.4.x` | 平台部署配置 |
| `OasisLMF/OasisPiWind` | `csi086126/TPRePiWind` | `stable/2.4.x` | 示例模型（可选） |
| `OasisLMF/OasisLMF` | `csi086126/TPRe` | `stable/2.4.x` | 核心库（可选） |

**说明：**
- ✅ **必须 Fork：** OasisUI, OasisPlatform
- 🔶 **推荐 Fork：** OasisPiWind（方便自定义示例数据）
- ⚪ **可选 Fork：** OasisLMF（如需修改核心逻辑）

---

## 🌐 GitHub 网页操作步骤

### 步骤 1：Fork OasisUI → TPReUI

1. **访问原始仓库：**
   ```
   https://github.com/OasisLMF/OasisUI
   ```

2. **点击右上角 "Fork" 按钮**

3. **配置 Fork 设置：**
   - **Owner:** `csi086126`
   - **Repository name:** `TPReUI` ⬅️ 修改这里
   - **Description:** `Taiping Reinsurance Catastrophe Risk UI - Customized from OasisLMF`
   - ✅ 勾选 "Copy the `main` branch only"
   - 点击 **"Create fork"**

4. **Fork 完成后，重命名检查：**
   - 仓库 URL 应该是：`https://github.com/csi086126/TPReUI`
   - 如果名称不对，进入 Settings → General → Repository name 修改

---

### 步骤 2：Fork OasisPlatform → TPRePlatform

1. **访问原始仓库：**
   ```
   https://github.com/OasisLMF/OasisPlatform
   ```

2. **点击 "Fork" 按钮**

3. **配置 Fork 设置：**
   - **Owner:** `csi086126`
   - **Repository name:** `TPRePlatform` ⬅️ 修改这里
   - **Description:** `Taiping Reinsurance Platform - Deployment configurations`
   - ⚠️ **取消勾选** "Copy the `main` branch only"（需要 stable/2.4.x 分支）
   - 点击 **"Create fork"**

4. **切换到正确的分支：**
   - 进入仓库后，点击左上角的分支选择器
   - 选择 `stable/2.4.x`
   - 在 Settings → General → Default branch 改为 `stable/2.4.x`

---

### 步骤 3：Fork OasisPiWind → TPRePiWind（推荐）

1. **访问原始仓库：**
   ```
   https://github.com/OasisLMF/OasisPiWind
   ```

2. **点击 "Fork" 按钮**

3. **配置 Fork 设置：**
   - **Owner:** `csi086126`
   - **Repository name:** `TPRePiWind` ⬅️ 修改这里
   - **Description:** `Taiping Reinsurance Demo Model`
   - 取消勾选 "Copy the `main` branch only"
   - 点击 **"Create fork"**

4. **切换默认分支到 `stable/2.4.x`**

---

### 步骤 4：Fork OasisLMF → TPRe（可选）

仅在需要修改核心计算逻辑时 Fork。

1. **访问：** `https://github.com/OasisLMF/OasisLMF`
2. Fork 为：`csi086126/TPRe`
3. 切换到 `stable/2.4.x` 分支

---

## 💻 本地克隆和重命名

### 克隆您的 Fork 仓库

在 Windows PowerShell 或 WSL 中执行：

```powershell
# 创建工作目录
cd D:\web-flood-insurance-model
mkdir TPRe-Project
cd TPRe-Project

# 克隆 UI 仓库
git clone https://github.com/csi086126/TPReUI.git
cd TPReUI
git remote add upstream https://github.com/OasisLMF/OasisUI.git
cd ..

# 克隆平台仓库
git clone -b stable/2.4.x https://github.com/csi086126/TPRePlatform.git
cd TPRePlatform
git remote add upstream https://github.com/OasisLMF/OasisPlatform.git
cd ..

# 克隆示例模型
git clone -b stable/2.4.x https://github.com/csi086126/TPRePiWind.git
cd TPRePiWind
git remote add upstream https://github.com/OasisLMF/OasisPiWind.git
cd ..
```

**说明：**
- `origin` = 您的 Fork（可写）
- `upstream` = 官方仓库（用于同步更新）

---

## 🤖 自动化脚本

### PowerShell 一键脚本

保存为 `setup-tpre-repos.ps1`：

```powershell
# TPRe GitHub 仓库设置脚本
# 使用前请确保已在 GitHub 网页完成 Fork 操作

param(
    [string]$WorkDir = "D:\web-flood-insurance-model\TPRe-Project"
)

Write-Host "`n=== TPRe 仓库克隆脚本 ===" -ForegroundColor Cyan
Write-Host "工作目录: $WorkDir`n" -ForegroundColor Yellow

# 创建工作目录
if (-not (Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
    Write-Host "✓ 创建工作目录" -ForegroundColor Green
}

cd $WorkDir

# 定义仓库列表
$repos = @(
    @{
        Name = "TPReUI"
        Branch = "main"
        Upstream = "https://github.com/OasisLMF/OasisUI.git"
    },
    @{
        Name = "TPRePlatform"
        Branch = "stable/2.4.x"
        Upstream = "https://github.com/OasisLMF/OasisPlatform.git"
    },
    @{
        Name = "TPRePiWind"
        Branch = "stable/2.4.x"
        Upstream = "https://github.com/OasisLMF/OasisPiWind.git"
    }
)

foreach ($repo in $repos) {
    $repoName = $repo.Name
    $branch = $repo.Branch
    $upstream = $repo.Upstream
    
    Write-Host "`n--- 处理 $repoName ---" -ForegroundColor Yellow
    
    if (Test-Path $repoName) {
        Write-Host "⚠ 目录已存在，跳过克隆" -ForegroundColor Yellow
        cd $repoName
    } else {
        # 克隆仓库
        Write-Host "→ 克隆 https://github.com/csi086126/$repoName.git" -ForegroundColor Cyan
        git clone -b $branch "https://github.com/csi086126/$repoName.git" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 克隆成功" -ForegroundColor Green
            cd $repoName
        } else {
            Write-Host "✗ 克隆失败，请检查仓库是否已在 GitHub Fork" -ForegroundColor Red
            continue
        }
    }
    
    # 添加 upstream 远程仓库
    $existingUpstream = git remote get-url upstream 2>&1
    if ($LASTEXITCODE -ne 0) {
        git remote add upstream $upstream
        Write-Host "✓ 添加 upstream: $upstream" -ForegroundColor Green
    } else {
        Write-Host "⚠ upstream 已存在: $existingUpstream" -ForegroundColor Yellow
    }
    
    # 显示远程仓库配置
    Write-Host "远程仓库配置:" -ForegroundColor Cyan
    git remote -v | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    cd ..
}

Write-Host "`n=== 完成！===" -ForegroundColor Green
Write-Host "`n下一步：" -ForegroundColor Yellow
Write-Host "1. cd $WorkDir\TPReUI" -ForegroundColor White
Write-Host "2. 应用 Taiping 主题定制" -ForegroundColor White
Write-Host "3. git add . && git commit && git push`n" -ForegroundColor White
```

### 执行脚本

```powershell
# 允许脚本执行（首次运行）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 执行脚本
.\setup-tpre-repos.ps1
```

---

## 🎨 应用 Taiping 定制到 TPReUI

### 复制定制文件

```powershell
cd D:\web-flood-insurance-model\TPRe-Project\TPReUI

# 从现有的 OasisUI-Taiping 复制文件
$source = "D:\web-flood-insurance-model\OasisUI-Taiping"

# CSS 文件
Copy-Item "$source\BFE_RShiny\oasisui\inst\app\www\css\oasisui-tweaks.css" `
          ".\BFE_RShiny\oasisui\inst\app\www\css\oasisui-tweaks.css" -Force

Copy-Item "$source\BFE_RShiny\oasisui\inst\app\www\css\bootstrap.css" `
          ".\BFE_RShiny\oasisui\inst\app\www\css\bootstrap.css" -Force

# R 模块
Copy-Item "$source\BFE_RShiny\oasisui\R\*.R" `
          ".\BFE_RShiny\oasisui\R\" -Force

Copy-Item "$source\BFE_RShiny\oasisui\inst\app\ui_auth.R" `
          ".\BFE_RShiny\oasisui\inst\app\ui_auth.R" -Force

# 额外 CSS
Copy-Item "$source\taiping-override.css" ".\taiping-override.css" -Force

Write-Host "✓ Taiping 定制文件已复制" -ForegroundColor Green
```

### 提交到 GitHub

```bash
cd D:\web-flood-insurance-model\TPRe-Project\TPReUI

git add .
git commit -m "feat: Apply Taiping Insurance Group branding

- Changed color scheme from red to blue-teal (#008B8B)
- Centered login dialog using CSS transform
- Removed OASIS branding and logos
- Updated UI labels for Taiping Reinsurance
- Added custom CSS overrides in taiping-override.css
- Modified R modules: login_ui, ui_auth, createHazardMap, ViewFilesInTable

Customization for: Taiping Property & Casualty Insurance Group
"

git push origin main
```

---

## ⚙️ 修改 TPRePlatform 配置

### 创建定制版 install.sh

在 `TPRePlatform` 目录：

```bash
cd D:\web-flood-insurance-model\TPRe-Project\TPRePlatform

# 备份原始文件
cp install.sh install.sh.original

# 编辑 install.sh
# 需要修改以下部分：
```

**修改点 1：仓库名称（约第 18-20 行）**

```bash
# 原始：
GIT_UI='BFE_RShiny'
GIT_API='OasisPlatform'
GIT_PIWIND='OasisPiWind'

# 修改为：
GIT_UI='TPReUI'
GIT_API='TPRePlatform'
GIT_PIWIND='TPRePiWind'
```

**修改点 2：GitHub 用户名（约第 60 行）**

```bash
# 原始：
git clone --depth 1 --branch $VERS_PIWIND https://github.com/OasisLMF/$GIT_PIWIND.git .

# 修改为：
git clone --depth 1 --branch $VERS_PIWIND https://github.com/csi086126/$GIT_PIWIND.git .
```

**修改点 3：UI 配置文件引用（约第 39, 71 行）**

```bash
# 原始：
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/oasis-ui-standalone.yml down
# ...
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/oasis-ui-standalone.yml up -d

# 修改为：
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/tpre-ui-standalone.yml down
# ...
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/tpre-ui-standalone.yml up -d
```

### 创建 tpre-ui-standalone.yml

复制并修改 `oasis-ui-standalone.yml`：

```bash
cp oasis-ui-standalone.yml tpre-ui-standalone.yml
```

编辑 `tpre-ui-standalone.yml`：

```yaml
version: '3'
services:
  user-interface:
    restart: always
    
    # 选项 1：从本地构建（推荐用于开发）
    build:
      context: ../TPReUI
      dockerfile: docker/Dockerfile
    
    # 选项 2：使用预构建镜像（推荐用于生产）
    # image: csi086126/tpreui:latest
    
    container_name: tpreui_app
    environment:
     - API_IP=server
     - API_PORT=8000
     - API_VERSION=v2
     - API_SHARE_FILEPATH=./downloads
     - OASIS_ENVIRONMENT=tpre_localhost
    ports:
     - 8080:3838
```

### 提交更改

```bash
git add install.sh tpre-ui-standalone.yml
git commit -m "feat: Customize for TPRe deployment

- Modified install.sh to use csi086126 GitHub repositories
- Created tpre-ui-standalone.yml for custom UI configuration
- Changed repository references from OasisLMF to TPRe series
- Updated container name from oasisui_app to tpreui_app
- Modified OASIS_ENVIRONMENT to tpre_localhost

This enables one-command deployment with Taiping customizations.
"

git push origin stable/2.4.x
```

---

## 🚀 服务器部署（下周执行）

### Linux 服务器操作

```bash
# SSH 登录
ssh sichen@Olmf-test01

# 清理旧环境
cd ~
rm -rf OasisEvaluation OasisUI-Taiping

# 克隆 TPRe 平台
git clone -b stable/2.4.x https://github.com/csi086126/TPRePlatform.git TPReEvaluation
cd TPReEvaluation

# 克隆 TPRe UI（如果使用本地构建）
cd ..
git clone https://github.com/csi086126/TPReUI.git

# 运行安装
cd TPReEvaluation
chmod +x install.sh
./install.sh

# 等待提示
# "Do you want to reinstall? [y/n]:" 输入 y
```

### 安装过程（自动）

```
✓ 删除旧 Docker 数据
✓ 克隆 TPRePiWind 模型
✓ 拉取/构建 Docker 镜像
✓ 启动所有容器
✓ Worker 自动注册 PiWind v1 和 v2 模型 ⬅️ 关键！
✓ UI 启动（Taiping 主题）
```

### 验证部署

```bash
# 检查容器状态
docker compose -f oasis-platform.yml -f tpre-ui-standalone.yml ps

# 检查模型是否自动注册
docker exec tpreevaluation-server-db-1 psql -U oasis -d oasis \
  -c "SELECT supplier_id, model_id, version_id FROM analysis_models_analysismodel;"

# 应该看到：
#  supplier_id | model_id | version_id 
# -------------+----------+------------
#  OasisLMF    | PiWind   | v1
#  OasisLMF    | PiWind   | v2
```

### 访问 UI

```
http://Olmf-test01:8080
或
http://localhost:8080 (如果在本地)

用户名：admin
密码：password
```

**期望结果：**
- ✅ 蓝色 Taiping 主题
- ✅ 登录框居中
- ✅ 无 OASIS 品牌
- ✅ 模型列表显示 PiWind v1 和 v2
- ✅ 可以创建 Portfolio 和 Analysis

---

## ✅ 验证清单

### GitHub 仓库检查

- [ ] `https://github.com/csi086126/TPReUI` 存在
- [ ] `https://github.com/csi086126/TPRePlatform` 存在
- [ ] `https://github.com/csi086126/TPRePiWind` 存在
- [ ] TPRePlatform 默认分支是 `stable/2.4.x`
- [ ] 所有仓库都设置了 `upstream` 远程仓库

### 本地文件检查

- [ ] `D:\web-flood-insurance-model\TPRe-Project\TPReUI` 存在
- [ ] `D:\web-flood-insurance-model\TPRe-Project\TPRePlatform` 存在
- [ ] `D:\web-flood-insurance-model\TPRe-Project\TPRePiWind` 存在

### 定制内容检查

- [ ] TPReUI 包含 Taiping CSS 修改（蓝色主题）
- [ ] TPReUI 包含居中登录的 CSS
- [ ] TPRePlatform 的 `install.sh` 引用 csi086126 仓库
- [ ] TPRePlatform 包含 `tpre-ui-standalone.yml`

### 服务器部署检查

- [ ] 所有容器正常运行
- [ ] 数据库中有 2 个模型记录（v1 和 v2）
- [ ] UI 显示 Taiping 蓝色主题
- [ ] 登录框居中显示
- [ ] 可以创建和运行分析

---

## 🔄 后续维护

### 同步上游更新

当 OasisLMF 官方发布新版本时：

```bash
# TPReUI
cd D:\web-flood-insurance-model\TPRe-Project\TPReUI
git fetch upstream
git merge upstream/main
# 解决冲突（如果有）
git push origin main

# TPRePlatform
cd D:\web-flood-insurance-model\TPRe-Project\TPRePlatform
git fetch upstream
git merge upstream/stable/2.4.x
# 解决冲突（如果有）
git push origin stable/2.4.x

# TPRePiWind
cd D:\web-flood-insurance-model\TPRe-Project\TPRePiWind
git fetch upstream
git merge upstream/stable/2.4.x
git push origin stable/2.4.x
```

### 更新服务器

```bash
ssh sichen@Olmf-test01

# 拉取最新代码
cd ~/TPReEvaluation
git pull

cd ~/TPReUI
git pull

# 重启服务
cd ~/TPReEvaluation
docker compose -f oasis-platform.yml -f tpre-ui-standalone.yml down
docker compose -f oasis-platform.yml -f tpre-ui-standalone.yml up -d --build
```

---

## 📞 常见问题

### Q1: Fork 后如何重命名仓库？

**A:** 进入仓库 → Settings → General → Repository name → 修改后 "Rename"

### Q2: 如何切换默认分支？

**A:** 进入仓库 → Settings → General → Default branch → 选择分支 → "Update"

### Q3: 为什么要添加 upstream 远程仓库？

**A:** 
- `origin` = 你的 Fork（可写，用于推送更改）
- `upstream` = 官方仓库（只读，用于获取更新）

这样可以在保留定制的同时，随时同步官方的 bug 修复和新功能。

### Q4: 本地已有 OasisUI-Taiping，需要重新做吗？

**A:** 不需要！可以直接把现有的修改复制到 TPReUI：

```powershell
cd D:\web-flood-insurance-model
cp -r OasisUI-Taiping TPRe-Project\TPReUI
cd TPRe-Project\TPReUI
# 然后 git add, commit, push
```

### Q5: 如何验证模型是否自动注册？

**A:** 查询数据库：

```bash
docker exec tpreevaluation-server-db-1 psql -U oasis -d oasis \
  -c "SELECT * FROM analysis_models_analysismodel;"
```

如果为空，检查：
1. Worker 容器日志：`docker logs tpreevaluation-v2-worker-1`
2. Server 容器日志：`docker logs tpreevaluation-server-1`
3. 确保使用了官方 install.sh 流程

---

## 📚 参考资料

- **OasisLMF 官方文档：** https://docs.oasislmf.org/
- **OasisPlatform GitHub：** https://github.com/OasisLMF/OasisPlatform
- **Docker Compose 文档：** https://docs.docker.com/compose/
- **Git Fork 工作流：** https://docs.github.com/en/get-started/quickstart/fork-a-repo

---

## 📝 总结

**这套方案的优势：**

1. ✅ **版本控制** - 所有定制在 Git 中追踪
2. ✅ **可复现** - 一键部署到任何服务器
3. ✅ **易维护** - 清晰的代码历史和变更记录
4. ✅ **可升级** - 随时同步官方更新
5. ✅ **团队协作** - 其他人也能看到和贡献
6. ✅ **自动化** - 模型自动注册，无需手动操作

**与临时方案的对比：**

| 特性 | 临时方案 (Volume Mount) | Fork 方案 (TPRe) |
|-----|----------------------|-----------------|
| 模型自动注册 | ❌ 失败 | ✅ 成功 |
| 版本控制 | ❌ 无 | ✅ Git |
| 可复现性 | ❌ 差 | ✅ 优秀 |
| 维护难度 | 🔶 高 | ✅ 低 |
| 团队协作 | ❌ 困难 | ✅ 简单 |

---

**准备好了就可以开始执行！祝您下周部署顺利！** 🚀

*最后更新：2025-10-26*
