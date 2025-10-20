# Vercel 部署指南

## 🚀 将项目部署到公网

您的代码已成功推送到 GitHub！现在可以通过 Vercel 部署到公网，让外部人员访问。

---

## 📋 部署步骤

### 第一步：登录 Vercel

1. **访问 Vercel 网站**
   ```
   https://vercel.com/
   ```

2. **使用 GitHub 账号登录**
   - 点击右上角 "Sign Up" 或 "Login"
   - 选择 "Continue with GitHub"
   - 授权 Vercel 访问您的 GitHub 账号

---

### 第二步：导入项目

1. **点击 "Add New..." 按钮**
   - 在 Vercel Dashboard 首页
   - 选择 "Project"

2. **导入 GitHub 仓库**
   - Vercel 会显示您的 GitHub 仓库列表
   - 找到 `flood-catastrophe-insurance-system`
   - 点击 "Import"

---

### 第三步：配置项目

**Vercel 会自动检测 Next.js 项目**

#### 基本配置（通常保持默认即可）

```
Project Name: flood-catastrophe-insurance-system
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

#### 环境变量（如果需要）

如果您的项目使用了环境变量（如 API keys），需要在这里添加：

```
点击 "Environment Variables" 展开
添加需要的变量：
- Name: NEXT_PUBLIC_API_URL
- Value: https://your-api.com
```

**注意**：您当前的项目没有环境变量要求，可以跳过此步骤。

---

### 第四步：部署

1. **点击 "Deploy" 按钮**
   - Vercel 会开始构建和部署项目
   - 构建过程大约需要 1-3 分钟

2. **等待部署完成**
   ```
   Building...
   ├─ Installing dependencies
   ├─ Building Next.js application
   └─ Deploying to Vercel Edge Network
   
   ✅ Deployment successful!
   ```

3. **获取公网地址**
   - 部署成功后，您会得到一个类似这样的地址：
   ```
   https://flood-catastrophe-insurance-system.vercel.app
   ```

---

## 🌍 访问您的网站

部署完成后，您可以通过以下方式访问：

### 1. Vercel 提供的域名
```
https://flood-catastrophe-insurance-system.vercel.app
```
- 这个地址可以立即使用
- 可以分享给其他人访问

### 2. 自定义域名（可选）

如果您有自己的域名，可以在 Vercel 中配置：

**步骤**：
1. 进入项目的 "Settings"
2. 点击 "Domains"
3. 添加您的域名（如 `www.yourcompany.com`）
4. 按照指示配置 DNS 记录

---

## ⚙️ Vercel 的特点和优势

### 1. 自动部署
- ✅ 每次推送代码到 GitHub `master` 分支
- ✅ Vercel 会自动重新构建和部署
- ✅ 不需要手动操作

### 2. 预览部署
- ✅ 每个 Pull Request 都会生成预览链接
- ✅ 方便测试新功能
- ✅ 不影响生产环境

### 3. 全球 CDN
- ✅ 自动部署到全球边缘节点
- ✅ 访问速度快
- ✅ 支持 HTTPS

### 4. 免费计划
```
✅ 100 GB 带宽/月
✅ 无限部署次数
✅ 自动 HTTPS
✅ 支持自定义域名
✅ 开源项目免费
```

---

## 🔧 后续更新流程

### 方式一：通过 Git 推送（推荐）

```bash
# 1. 修改代码
# 2. 提交更改
git add .
git commit -m "更新说明"

# 3. 推送到 GitHub
git push origin master

# ✅ Vercel 会自动检测并重新部署（大约1-3分钟）
```

### 方式二：通过 Vercel Dashboard

1. 进入 Vercel 项目页面
2. 点击 "Deployments" 标签
3. 点击 "Redeploy" 按钮

---

## ⚠️ 重要注意事项

### 1. GeoServer WMS 服务问题

您的项目使用了内网 GeoServer：
```
http://143.89.22.7:8090/geoserver/wms
```

**问题**：
- ❌ 这个地址是内网 IP，外部无法访问
- ❌ 部署到 Vercel 后，地图图层会无法加载

**解决方案**：

#### 方案 A：将 GeoServer 部署到公网（推荐）
```
1. 使用云服务器部署 GeoServer
   - AWS EC2
   - 阿里云 ECS
   - 腾讯云 CVM

2. 配置公网访问
   - 设置安全组规则
   - 开放 8090 端口

3. 更新项目中的 WMS URL
   - 修改 src/app/riskmap/page.tsx
   - 替换为公网地址
```

#### 方案 B：使用代理（临时方案）
```typescript
// 在 Next.js API Route 中创建代理
// src/app/api/geoserver/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wmsParams = searchParams.toString();
  
  const geoserverUrl = process.env.GEOSERVER_URL; // 内网地址
  const response = await fetch(`${geoserverUrl}?${wmsParams}`);
  
  return new Response(response.body);
}
```

### 2. 登录功能

当前登录是本地存储（localStorage），部署后：
- ✅ 仍然可以使用
- ⚠️ 但是登录状态只在浏览器本地
- 💡 建议：后续考虑使用真实的后端认证（如 NextAuth.js）

### 3. 数据持久化

当前事件数据保存在本地文件：
```
public/data/historical-events.json
```

**问题**：
- ❌ Vercel 的文件系统是只读的
- ❌ 上传的事件会丢失

**解决方案**：

#### 方案 A：使用数据库（推荐）
```
1. 选择数据库服务
   - Vercel Postgres（免费额度）
   - MongoDB Atlas（免费额度）
   - Supabase（免费额度）

2. 迁移数据存储
   - 从文件系统改为数据库
   - 更新 API routes
```

#### 方案 B：使用 Vercel Blob 存储
```javascript
// 使用 @vercel/blob
import { put, list } from '@vercel/blob';

// 上传文件
const blob = await put('events.json', file, { access: 'public' });

// 读取文件
const blobs = await list();
```

---

## 📝 推荐的部署清单

### 立即可以做的：
- ✅ 部署到 Vercel（基本功能可用）
- ✅ 获取公网访问链接
- ✅ 分享给其他人查看界面

### 短期需要做的（1-2周）：
- ⚠️ 将 GeoServer 部署到公网
- ⚠️ 配置数据库存储事件数据
- ⚠️ 添加真实的认证系统

### 长期优化（1-2月）：
- 💡 配置自定义域名
- 💡 添加监控和日志
- 💡 优化性能和 SEO

---

## 🆘 常见问题

### Q1: 部署失败怎么办？

**查看构建日志**：
1. 进入 Vercel 项目页面
2. 点击失败的部署
3. 查看 "Build Logs"
4. 根据错误信息调试

**常见错误**：
```
Error: Cannot find module 'xxx'
解决：检查 package.json 依赖

Error: Build exceeded maximum time
解决：优化构建脚本，移除不必要的依赖

Error: Out of memory
解决：减少构建时的内存占用
```

### Q2: 部署后地图不显示？

**原因**：GeoServer 是内网地址

**临时解决**：
- 注释掉 WMS 图层显示
- 或使用公开的 WMS 服务测试

### Q3: 如何查看部署日志？

1. Vercel Dashboard → 选择项目
2. Deployments → 点击具体的部署
3. 查看 Build Logs 和 Runtime Logs

### Q4: 如何回滚到之前的版本？

1. Deployments → 选择历史版本
2. 点击右边的 "..." 菜单
3. 选择 "Promote to Production"

---

## 💡 下一步建议

### 立即部署（5分钟）：
```
1. ✅ 登录 Vercel
2. ✅ 导入 GitHub 仓库
3. ✅ 点击 Deploy
4. ✅ 获取公网地址并分享
```

### 完善功能（本周）：
```
1. 将 GeoServer 迁移到公网服务器
2. 配置环境变量
3. 测试所有功能是否正常
```

### 生产优化（下周）：
```
1. 配置数据库存储
2. 添加用户认证
3. 优化性能
4. 配置自定义域名
```

---

## 🔗 有用的链接

- **Vercel 官方文档**: https://vercel.com/docs
- **Next.js 部署指南**: https://nextjs.org/docs/deployment
- **Vercel CLI 工具**: https://vercel.com/docs/cli

---

**现在就可以开始部署了！**

访问 https://vercel.com/ 开始您的第一次部署 🚀

