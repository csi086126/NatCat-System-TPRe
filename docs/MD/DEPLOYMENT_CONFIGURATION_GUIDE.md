# Nat Cat Platform - 部署配置指南

## 📋 概述

本平台使用环境变量管理敏感配置信息(如GeoServer账号密码),确保安全性和灵活性。

---

## 🚀 快速开始

### 1. 首次部署配置

```bash
# 1. 复制配置模板
copy .env.example .env

# 2. 编辑 .env 文件,填入你的实际配置
notepad .env

# 3. 安装依赖(如果还没有安装)
npm install dotenv
pip install python-dotenv

# 4. 运行脚本
node upload-tpu-simple.js
python scripts/publish-ibtracs.py
```

---

## 🔧 配置文件说明

### `.env.example` (模板文件)
- **用途**: 配置模板,提交到Git仓库
- **内容**: 包含所有配置项,但不包含真实密码
- **作用**: 新用户部署时复制此文件创建自己的 `.env`

### `.env` (实际配置文件)
- **用途**: 存储真实的账号密码
- **安全**: 已在 `.gitignore` 中,不会被提交到Git
- **位置**: 项目根目录

---

## 📝 配置项说明

### GeoServer 连接配置

```bash
# GeoServer 服务地址
GEOSERVER_URL=http://localhost:8080/geoserver

# GeoServer 管理员账号
GEOSERVER_USER=chensi

# GeoServer 管理员密码 (请修改为你的实际密码)
GEOSERVER_PASS=your-password-here
```

### 可选配置

```bash
# 内网GeoServer地址 (如果不同于上面的URL)
GEOSERVER_INTERNAL_URL=http://10.253.22.15:8080/geoserver

# 数据目录路径
IBTRACS_DATA_DIR=D:/web-flood-insurance-model/Data/IBTracks
MACAU_DATA_DIR=D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/WGS84
```

---

## 🏢 多环境部署

### 场景1: 开发环境
```bash
# .env (本地开发)
GEOSERVER_URL=http://localhost:8080/geoserver
GEOSERVER_USER=admin
GEOSERVER_PASS=dev-password
```

### 场景2: 生产环境
```bash
# .env (生产服务器)
GEOSERVER_URL=http://10.253.22.15:8080/geoserver
GEOSERVER_USER=chensi
GEOSERVER_PASS=production-strong-password
```

### 场景3: 其他公司/单位部署

**交付给客户时**:
1. 提供代码包(包含 `.env.example`)
2. 提供本部署文档
3. 客户自行创建 `.env` 并填入他们的GeoServer配置

**客户操作步骤**:
```bash
# 1. 收到代码后
cd nat-cat-platform

# 2. 复制配置模板
copy .env.example .env

# 3. 编辑配置文件
notepad .env

# 4. 填入客户自己的GeoServer信息:
#    - GEOSERVER_URL: 客户的GeoServer地址
#    - GEOSERVER_USER: 客户的管理员账号
#    - GEOSERVER_PASS: 客户的密码

# 5. 安装依赖
npm install
pip install -r requirements.txt

# 6. 运行
npm run dev
```

---

## 🔒 安全最佳实践

### ✅ 推荐做法

1. **绝不提交 `.env` 到Git**
   - 已在 `.gitignore` 中配置
   - 密码只存在于本地

2. **使用强密码**
   ```
   ❌ 弱密码: admin123
   ✅ 强密码: Use-A-Unique-Long-Password! (至少12位,包含大小写、数字、符号)
   ```

3. **定期更换密码**
   - 建议每3-6个月更换一次
   - 更换后只需修改 `.env` 文件

4. **限制文件访问权限**
   ```bash
   # Linux/Mac
   chmod 600 .env

   # Windows (使用PowerShell)
   icacls .env /inheritance:r /grant:r "$env:USERNAME:F"
   ```

### ❌ 避免的做法

1. ❌ 不要将密码硬编码在代码中
2. ❌ 不要将 `.env` 提交到Git
3. ❌ 不要在邮件/聊天中明文发送密码
4. ❌ 不要使用默认密码 (如 admin/geoserver)

---

## 🐛 常见问题

### Q1: 脚本提示 "Cannot find module 'dotenv'"
```bash
# 解决方案
npm install dotenv           # JavaScript
pip install python-dotenv    # Python
```

### Q2: 脚本无法连接GeoServer
```bash
# 检查清单
1. 确认 .env 文件存在
2. 确认密码正确
3. 确认GeoServer正在运行
4. 测试连接: curl http://localhost:8080/geoserver
```

### Q3: 如何给新同事/客户配置?
```bash
# 只需发送:
1. 代码仓库地址 (包含 .env.example)
2. 本部署文档
3. 让他们自己创建 .env 并填入配置
```

### Q4: 修改密码后需要重启服务吗?
```bash
# 脚本: 不需要,下次运行时自动读取新密码
# 应用: 需要重启 (npm run dev)
```

---

## 📚 相关脚本说明

### JavaScript 脚本
- `upload-tpu-to-geoserver.js` - 上传TPU数据
- `upload-tpu-simple.js` - 简化版上传脚本

### Python 脚本
- `scripts/publish-ibtracs.py` - 发布IBTracks数据
- `scripts/batch-publish-geoserver.py` - 批量发布TIF
- `scripts/publish-layers-from-stores.py` - 从Store发布图层

**所有脚本已配置为自动从 `.env` 读取配置!**

---

## 📞 技术支持

如有问题,请联系开发团队或查看:
- GeoServer官方文档: https://docs.geoserver.org/
- 项目文档目录: `MD/`

---

**最后更新**: 2025-12-19
