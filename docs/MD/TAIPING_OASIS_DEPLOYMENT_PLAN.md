# 太平 OasisLMF 定制版部署方案

## 📌 总体架构

```
GitHub 组织：csi086126
├── OasisUI-TP              # Fork + Taiping 定制 UI
├── OasisPlatform-TP        # Fork + 定制部署配置
└── OasisPiWind             # Fork 示例模型（可选）
```

---

## 🎯 阶段 1：Fork 仓库到您的 GitHub

### 1.1 在 GitHub 网页操作

访问以下链接，点击 "Fork" 按钮：

1. **OasisUI** → `https://github.com/OasisLMF/OasisUI`
   - Fork 到：`csi086126/OasisUI-TP`
   - 建议勾选 "Copy the `main` branch only"

2. **OasisPlatform** → `https://github.com/OasisLMF/OasisPlatform`
   - Fork 到：`csi086126/OasisPlatform-TP`
   - 选择 branch：`stable/2.4.x`

3. **PiWind** (可选) → `https://github.com/OasisLMF/OasisPiWind`
   - Fork 到：`csi086126/OasisPiWind`
   - 选择 branch：`stable/2.4.x`

---

## 🎨 阶段 2：定制 OasisUI-TP

### 2.1 克隆您的 Fork

```bash
# 在 Windows 上
cd D:\web-flood-insurance-model
git clone https://github.com/csi086126/OasisUI-TP.git
cd OasisUI-TP
```

### 2.2 应用 Taiping 主题修改

从现有的 `OasisUI-Taiping` 复制定制文件：

```bash
# 复制所有修改过的文件
$source = "D:\web-flood-insurance-model\OasisUI-Taiping"
$target = "D:\web-flood-insurance-model\OasisUI-TP"

# CSS 文件
Copy-Item "$source\BFE_RShiny\oasisui\inst\app\www\css\oasisui-tweaks.css" `
          "$target\BFE_RShiny\oasisui\inst\app\www\css\oasisui-tweaks.css" -Force

Copy-Item "$source\BFE_RShiny\oasisui\inst\app\www\css\bootstrap.css" `
          "$target\BFE_RShiny\oasisui\inst\app\www\css\bootstrap.css" -Force

# R 模块文件
Copy-Item "$source\BFE_RShiny\oasisui\R\login_ui.R" `
          "$target\BFE_RShiny\oasisui\R\login_ui.R" -Force

Copy-Item "$source\BFE_RShiny\oasisui\R\createHazardMap_module.R" `
          "$target\BFE_RShiny\oasisui\R\createHazardMap_module.R" -Force

Copy-Item "$source\BFE_RShiny\oasisui\R\ViewFilesInTable_module.R" `
          "$target\BFE_RShiny\oasisui\R\ViewFilesInTable_module.R" -Force

Copy-Item "$source\BFE_RShiny\oasisui\inst\app\ui_auth.R" `
          "$target\BFE_RShiny\oasisui\inst\app\ui_auth.R" -Force

# 额外的 CSS 覆盖文件
Copy-Item "$source\taiping-override.css" `
          "$target\taiping-override.css" -Force
```

### 2.3 提交到 GitHub

```bash
cd D:\web-flood-insurance-model\OasisUI-TP

git add .
git commit -m "feat: Apply Taiping Insurance Group theme customization

- Changed color scheme from red to blue-teal
- Centered login dialog
- Removed OASIS branding
- Updated UI labels for Taiping branding
"

git push origin main
```

---

## ⚙️ 阶段 3：定制 OasisPlatform-TP

### 3.1 克隆平台仓库

```bash
cd D:\web-flood-insurance-model
git clone -b stable/2.4.x https://github.com/csi086126/OasisPlatform-TP.git
cd OasisPlatform-TP
```

### 3.2 修改 `install.sh`

**修改点 1：使用您自己的仓库**

```bash
# 原始代码（约第 18-20 行）
GIT_UI='BFE_RShiny'
GIT_API='OasisPlatform'
GIT_PIWIND='OasisPiWind'

# 修改为：
GIT_UI='OasisUI-TP'           # ← 改为您的定制 UI 仓库名
GIT_API='OasisPlatform-TP'
GIT_PIWIND='OasisPiWind'
```

**修改点 2：GitHub 用户名**

```bash
# 在克隆命令处添加您的用户名
# 找到克隆 PiWind 的部分（约第 60 行）

# 原始：
git clone --depth 1 --branch $VERS_PIWIND https://github.com/OasisLMF/$GIT_PIWIND.git .

# 修改为：
git clone --depth 1 --branch $VERS_PIWIND https://github.com/csi086126/$GIT_PIWIND.git .
```

### 3.3 创建 `oasis-ui-standalone-tp.yml`

在 `OasisPlatform-TP` 目录创建新文件：

```yaml
version: '3'
services:
  user-interface:
    restart: always
    # 选项 1：使用预构建镜像（需要先构建并推送到 Docker Hub）
    # image: csi086126/oasisui-tp:latest
    
    # 选项 2：从本地 Dockerfile 构建
    build:
      context: ../OasisUI-TP
      dockerfile: docker/Dockerfile
    
    container_name: oasisui_app
    environment:
     - API_IP=server
     - API_PORT=8000
     - API_VERSION=v2
     - API_SHARE_FILEPATH=./downloads
     - OASIS_ENVIRONMENT=oasis_localhost
    ports:
     - 8080:3838
```

**说明：**
- 选项 1 适合生产环境（镜像预构建）
- 选项 2 适合开发环境（每次从源码构建）

### 3.4 修改 `install.sh` 使用新 UI 配置

```bash
# 找到所有 oasis-ui-standalone.yml 的引用，改为 oasis-ui-standalone-tp.yml

# 约第 39 行：
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/oasis-ui-standalone-tp.yml down

# 约第 71 行：
docker compose -f $SCRIPT_DIR/oasis-platform.yml -f $SCRIPT_DIR/oasis-ui-standalone-tp.yml up -d
```

### 3.5 提交修改

```bash
git add install.sh oasis-ui-standalone-tp.yml
git commit -m "feat: Use Taiping customized UI (OasisUI-TP)

- Modified install.sh to use csi086126 GitHub repos
- Created oasis-ui-standalone-tp.yml for custom UI
- Changed UI repository from OasisUI to OasisUI-TP
"

git push origin stable/2.4.x
```

---

## 🚀 阶段 4：服务器部署

### 4.1 在 Linux 服务器上克隆

```bash
# SSH 登录到 Olmf-test01
ssh sichen@Olmf-test01

# 清理旧安装（如果存在）
cd ~
rm -rf OasisEvaluation OasisUI-Taiping

# 克隆您的定制版本
git clone -b stable/2.4.x https://github.com/csi086126/OasisPlatform-TP.git OasisEvaluation
cd OasisEvaluation

# 克隆 UI（如果选择选项 2 - 本地构建）
cd ..
git clone https://github.com/csi086126/OasisUI-TP.git
```

### 4.2 运行安装脚本

```bash
cd ~/OasisEvaluation
chmod +x install.sh
./install.sh
```

**安装过程：**
1. ✅ 提示是否重装 → 选择 `y`
2. ✅ 删除旧 Docker 数据
3. ✅ 克隆 PiWind 模型（从 `csi086126/OasisPiWind`）
4. ✅ 拉取 Worker/Server 镜像
5. ✅ 构建/拉取 Taiping UI 镜像
6. ✅ 启动所有容器
7. ✅ **Worker 自动注册 PiWind v1 和 v2 模型** ⬅️ 关键！

### 4.3 验证部署

```bash
# 检查容器状态
docker compose -f oasis-platform.yml -f oasis-ui-standalone-tp.yml ps

# 检查模型是否注册
docker exec oasisevaluation-server-db-1 psql -U oasis -d oasis \
  -c "SELECT supplier_id, model_id, version_id FROM analysis_models_analysismodel;"

# 应该看到：
#  supplier_id | model_id | version_id 
# -------------+----------+------------
#  OasisLMF    | PiWind   | v1
#  OasisLMF    | PiWind   | v2
```

### 4.4 访问 UI

```
http://localhost:8080
用户名：admin
密码：password
```

**期望结果：**
- ✅ 蓝色 Taiping 主题
- ✅ 登录框居中
- ✅ 模型列表显示 "PiWind v1" 和 "PiWind v2"
- ✅ 可以创建 Portfolio 和 Analysis

---

## 🔧 阶段 5：持续维护

### 5.1 更新流程

当需要修改 UI：

```bash
# 本地修改
cd D:\web-flood-insurance-model\OasisUI-TP
# ... 修改文件 ...
git add .
git commit -m "fix: 某项改进"
git push

# 服务器更新
ssh sichen@Olmf-test01
cd ~/OasisUI-TP
git pull
cd ~/OasisEvaluation
docker compose -f oasis-platform.yml -f oasis-ui-standalone-tp.yml down
docker compose -f oasis-platform.yml -f oasis-ui-standalone-tp.yml up -d --build
```

### 5.2 升级 OasisLMF

当官方发布新版本：

```bash
# 同步上游更新
cd D:\web-flood-insurance-model\OasisPlatform-TP
git remote add upstream https://github.com/OasisLMF/OasisPlatform.git
git fetch upstream
git merge upstream/stable/2.4.x

# 解决冲突（如果有）
# 提交并推送
git push origin stable/2.4.x
```

---

## 📊 当前状态 vs 目标状态

### ❌ 当前问题（临时方案）

```
OasisEvaluation (官方仓库)
├── install.sh (官方脚本)
├── oasis-ui-standalone-taiping.yml (手动创建)
└── 使用 volume mount 挂载本地文件
    └── ~/OasisUI-Taiping/ (手动同步)
```

**问题：**
- ❌ 模型未自动注册（不知道为什么）
- ❌ 配置文件不在版本控制中
- ❌ 需要手动同步文件
- ❌ 难以复现和维护

### ✅ 目标方案（最佳实践）

```
csi086126/OasisPlatform-TP (您的仓库)
├── install.sh (修改为使用您的仓库)
├── oasis-ui-standalone-tp.yml (集成到仓库)
└── 构建包含 Taiping 主题的 UI 镜像
    └── csi086126/OasisUI-TP (您的仓库)
```

**优势：**
- ✅ 一键部署，自动注册模型
- ✅ 所有定制都在 Git 版本控制中
- ✅ 易于团队协作
- ✅ 便于升级和维护
- ✅ 符合 DevOps 最佳实践

---

## 🎯 立即行动计划

### 今天完成：

1. ✅ **Fork 仓库**（5 分钟）
   - Fork OasisUI → OasisUI-TP
   - Fork OasisPlatform → OasisPlatform-TP

2. ✅ **本地整理**（30 分钟）
   - 克隆 OasisUI-TP
   - 应用所有 Taiping 定制
   - 提交并推送

3. ✅ **修改部署配置**（30 分钟）
   - 克隆 OasisPlatform-TP
   - 修改 install.sh
   - 创建 oasis-ui-standalone-tp.yml
   - 提交并推送

### 明天完成：

4. ✅ **服务器全新部署**（20 分钟）
   - 清理旧环境
   - 克隆 OasisPlatform-TP
   - 运行 install.sh
   - 验证模型自动注册 ⬅️ **这次应该成功！**

5. ✅ **集成到 NatCat**（已完成）
   - oasislmf/page.tsx 已经简化
   - 直接 iframe 到 localhost:8080

---

## ❓ 为什么这次会成功？

### 当前方案的问题：

```bash
# 当前：手动创建配置，使用 volume mount
docker compose -f oasis-platform.yml -f oasis-ui-standalone-taiping.yml up -d
```

**Worker 期望的行为：**
1. 启动时读取 `/home/worker/model/` 目录
2. 调用 API 注册模型：`POST /v2/models/`
3. **但可能因为容器启动顺序、网络、权限等问题失败**

### 新方案的优势：

```bash
# 新方案：使用官方的 install.sh 流程
./install.sh
```

**正确的启动顺序：**
1. ✅ 克隆 PiWind 到 `./OasisPiWind/`
2. ✅ 启动数据库容器
3. ✅ 运行 migrations
4. ✅ 启动 API server
5. ✅ 启动 worker（挂载 `./OasisPiWind/`）
6. ✅ Worker 自动注册模型到 API
7. ✅ 启动 UI（使用 Taiping 定制版）

**关键差异：**
- 官方脚本确保了**正确的启动顺序**
- `./OasisPiWind/` 是**相对路径挂载**
- Worker 与 API 的**网络通信已配置好**
- **数据库 migrations 在 worker 启动前完成**

---

## 📝 总结

您的思路完全正确！这就是专业的做法：

1. **Fork 官方仓库** - 保留升级能力
2. **应用定制修改** - 在您的仓库中维护
3. **版本控制一切** - Git 管理所有配置
4. **自动化部署** - 一键安装，自动注册模型

这样不仅解决了当前的模型注册问题，还建立了一个**可维护、可扩展、可复现**的部署架构！

---

**准备好开始了吗？需要我帮您执行哪一步？** 🚀
