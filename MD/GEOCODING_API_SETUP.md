# Geocoding API Setup Guide

## 为什么需要改进地理编码服务？

我们的 Riskmap 之前只使用 OpenStreetMap Nominatim 进行地址解析，但 Nominatim 对中文地址的支持较弱。例如：
- ❌ 搜索"上海法国学校"会定位到日本京都
- ❌ 中文地址识别准确率低
- ❌ 缺少详细的地址信息

为了解决这个问题，我们集成了**高德地图**和**百度地图** API，它们是中国最准确的地理编码服务。

## 智能回退策略

系统现在使用智能回退策略：

### 🇨🇳 中文地址（检测到中文字符时）
1. **首选**：高德地图 API (Amap)
2. **备选**：百度地图 API (Baidu Maps)
3. **最后**：OpenStreetMap Nominatim

### 🌍 国际地址（无中文字符时）
1. **首选**：OpenStreetMap Nominatim

## 如何获取 API Key

### 1. 高德地图 API Key（推荐用于中国地址）

#### 注册步骤：
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 点击右上角"注册/登录"
3. 注册开发者账号（需要实名认证）
4. 进入"控制台" → "应用管理" → "创建新应用"
5. 填写应用信息：
   - 应用名称：Natural Catastrophe Risk Platform
   - 应用类型：Web服务
6. 点击"添加Key"：
   - Key名称：Riskmap Geocoding
   - 服务平台：Web服务
7. 复制生成的 Key

#### 配额说明：
- **个人开发者**：30万次/天（免费）
- **企业认证**：100万次/天（免费）
- 超过配额需付费

#### 配置方法：
在 `src/app/riskmap/page.tsx` 中找到以下代码：
```typescript
const AMAP_KEY = 'YOUR_AMAP_KEY_HERE'; // TODO: Replace with your Amap API key
```
替换为你的 Key：
```typescript
const AMAP_KEY = 'your-actual-amap-key-12345678';
```

---

### 2. 百度地图 API Key（备选方案）

#### 注册步骤：
1. 访问 [百度地图开放平台](https://lbsyun.baidu.com/)
2. 注册开发者账号
3. 进入"控制台" → "创建应用"
4. 填写应用信息：
   - 应用名称：Natural Catastrophe Risk Platform
   - 应用类型：服务端
   - IP白名单：0.0.0.0/0（开发环境）或你的服务器 IP
5. 获取 AK (Access Key)

#### 配额说明：
- **个人开发者**：30万次/天（免费）
- **企业认证**：100万次/天（免费）

#### 配置方法：
在 `src/app/riskmap/page.tsx` 中找到以下代码：
```typescript
const BAIDU_KEY = 'YOUR_BAIDU_KEY_HERE'; // TODO: Replace with your Baidu API key
```
替换为你的 Key：
```typescript
const BAIDU_KEY = 'your-actual-baidu-key-12345678';
```

---

## 测试地址示例

配置完成后，可以测试以下地址：

### ✅ 中文地址（应该成功定位）
- 上海法国学校
- 北京天安门
- 深圳市南山区科技园
- 杭州西湖
- 广州塔

### ✅ 国际地址（使用 Nominatim）
- Eiffel Tower, Paris
- Big Ben, London
- Statue of Liberty, New York
- Tokyo Tower, Japan

### ✅ 坐标（直接解析）
- 31.2304, 121.4737 (上海)
- 22.2855, 114.1577 (香港)

---

## API 安全建议

### 生产环境配置

1. **不要直接硬编码 API Key**
   - 使用环境变量
   - 创建 `.env.local` 文件：
   ```
   NEXT_PUBLIC_AMAP_KEY=your_amap_key
   NEXT_PUBLIC_BAIDU_KEY=your_baidu_key
   ```

2. **在代码中使用环境变量**
   ```typescript
   const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';
   const BAIDU_KEY = process.env.NEXT_PUBLIC_BAIDU_KEY || '';
   ```

3. **设置域名白名单**
   - 高德：限制 Referer 或 IP
   - 百度：设置 IP 白名单

4. **监控用量**
   - 定期检查 API 调用次数
   - 设置用量告警

---

## 故障排查

### 问题：搜索中文地址仍然失败

**可能原因**：
1. API Key 未配置或配置错误
2. API Key 配额用尽
3. 网络问题（防火墙/代理）

**解决方法**：
1. 检查浏览器控制台的错误信息
2. 确认 API Key 已正确配置
3. 测试 API 是否可访问：
   ```bash
   curl "https://restapi.amap.com/v3/geocode/geo?key=YOUR_KEY&address=北京"
   ```

### 问题：国际地址定位不准

**可能原因**：
- Nominatim 对某些地区的数据覆盖不全

**解决方法**：
- 使用更详细的地址
- 使用英文地址
- 直接使用坐标

---

## 开发 vs 生产环境

### 开发环境（当前）
- 直接在前端调用 API
- 适合快速测试
- ⚠️ API Key 暴露在浏览器中

### 生产环境（推荐）
- 创建后端代理接口
- 在服务端调用 API
- ✅ API Key 保密
- ✅ 可以添加缓存、限流等功能

**示例：创建 Next.js API 路由**
```typescript
// src/app/api/geocode/route.ts
export async function POST(request: Request) {
  const { query } = await request.json();
  
  // 在服务端调用高德 API
  const response = await fetch(
    `https://restapi.amap.com/v3/geocode/geo?key=${process.env.AMAP_KEY}&address=${query}`
  );
  
  return Response.json(await response.json());
}
```

---

## 费用估算

假设每天 1000 次查询：

| 服务 | 免费额度 | 月查询量 | 费用 |
|------|----------|----------|------|
| 高德地图 | 30万次/天 | 3万次 | ¥0 |
| 百度地图 | 30万次/天 | 3万次 | ¥0 |
| Nominatim | 无限制 | 3万次 | ¥0 |

**结论**：对于中小规模应用，完全可以使用免费额度。

---

## 更新日志

### 2025-10-22
- ✅ 添加高德地图 API 集成
- ✅ 添加百度地图 API 集成
- ✅ 实现智能回退策略（中文优先使用国内服务）
- ✅ 更新 UI 显示地理编码服务来源
- ✅ 优化错误提示

---

## 参考文档

- [高德地图 Web 服务 API](https://lbs.amap.com/api/webservice/summary)
- [百度地图 Web 服务 API](https://lbsyun.baidu.com/index.php?title=webapi)
- [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Overview/)
