# 后端 API 使用指南

## 概述

本项目使用 **Next.js API Routes** 实现后端 API，提供灾害事件数据的持久化存储功能。

## 架构设计

```
前端 (React)
    ↓
API 工具函数 (src/lib/api/events.ts)
    ↓
Next.js API Routes (src/app/api/events/)
    ↓
文件系统存储 (public/data/ 和 public/uploads/)
```

## 数据存储位置

### 1. 事件元数据
- **历史事件**: `public/data/historical-events.json`
- **随机事件**: `public/data/stochastic-events-index.json`

### 2. 上传文件
- **路径**: `public/uploads/{eventId}/`
- **文件类型**: Shapefile, TIFF, Binary, GeoJSON 等

## API 端点

### 1. 事件管理 API (`/api/events`)

#### GET - 获取事件列表
```
GET /api/events
GET /api/events?category=historical
GET /api/events?category=stochastic
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "historical": [...],
    "stochastic": [...]
  },
  "timestamp": "2025-10-16T..."
}
```

#### POST - 创建新事件
```
POST /api/events
Content-Type: application/json

{
  "event": {
    "id": "Typhoon-2024-001",
    "name": "Typhoon Hato",
    "type": "typhoon",
    "date": "2024-08-23",
    ...
  },
  "category": "historical"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Event created",
  "data": {...},
  "timestamp": "2025-10-16T..."
}
```

#### PUT - 更新事件
```
PUT /api/events
Content-Type: application/json

{
  "event": {
    "id": "Typhoon-2024-001",
    "name": "Updated Name",
    ...
  },
  "category": "historical"
}
```

#### DELETE - 删除事件
```
DELETE /api/events?id=Typhoon-2024-001&category=historical
```

### 2. 文件上传 API (`/api/events/upload`)

#### POST - 上传文件
```
POST /api/events/upload
Content-Type: multipart/form-data

FormData:
  - files: File[] (多个文件)
  - eventId: string (事件ID)
  - fileType: 'shapefile' | 'tiff' | 'binary' | 'geojson'
```

**响应示例**:
```json
{
  "success": true,
  "message": "3 file(s) uploaded successfully",
  "data": {
    "eventId": "Typhoon-2024-001",
    "fileType": "shapefile",
    "files": [
      {
        "name": "flood_area.shp",
        "path": "/uploads/Typhoon-2024-001/flood_area.shp",
        "size": 245678
      },
      ...
    ],
    "uploadDir": "/uploads/Typhoon-2024-001"
  }
}
```

#### GET - 获取事件的文件列表
```
GET /api/events/upload?eventId=Typhoon-2024-001
```

## 前端集成

### 安装依赖
```bash
# 已包含在项目中，无需额外安装
```

### 使用 API 工具函数

#### 1. 导入工具函数
```typescript
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  uploadEventFiles,
  createEventWithFiles
} from '@/lib/api/events';
```

#### 2. 获取事件列表
```typescript
// 获取所有事件
const result = await getEvents();
if (result.success) {
  const { historical, stochastic } = result.data;
  console.log('Historical events:', historical);
  console.log('Stochastic events:', stochastic);
}

// 只获取历史事件
const historicalResult = await getEvents('historical');
```

#### 3. 创建事件
```typescript
const newEvent = {
  id: 'Typhoon-2024-001',
  name: 'Typhoon Hato',
  type: 'typhoon',
  date: '2024-08-23',
  impactArea: {
    level1: 'Hong Kong',
    level2: 'Hong Kong Island',
    level3: 'Central and Western'
  },
  severity: 'high',
  coordinates: [22.3193, 114.1694]
};

const result = await createEvent(newEvent, 'historical');
if (result.success) {
  console.log('Event created:', result.data);
}
```

#### 4. 上传文件
```typescript
// 用户选择文件后
const files = Array.from(fileInput.files);
const result = await uploadEventFiles(
  files,
  'Typhoon-2024-001',
  'shapefile'
);

if (result.success) {
  console.log('Files uploaded:', result.data.files);
}
```

#### 5. 创建事件并上传文件（一步完成）
```typescript
const result = await createEventWithFiles(
  newEvent,
  'historical',
  files,
  'shapefile'
);

if (result.success) {
  console.log('Event and files created:', result.data);
}
```

#### 6. 更新事件
```typescript
const updatedEvent = {
  ...existingEvent,
  name: 'Updated Name',
  severity: 'critical'
};

const result = await updateEvent(updatedEvent, 'historical');
```

#### 7. 删除事件
```typescript
const result = await deleteEvent('Typhoon-2024-001', 'historical');
if (result.success) {
  console.log('Event deleted');
}
```

## 修改前端代码以使用后端 API

### 修改 `disasterinfo/page.tsx`

需要在以下地方集成 API：

1. **页面加载时获取数据**:
```typescript
useEffect(() => {
  const loadEvents = async () => {
    const result = await getEvents();
    if (result.success) {
      setHistoricalEvents(result.data.historical || []);
      setStochasticEvents(result.data.stochastic || []);
    }
  };
  
  loadEvents();
}, []);
```

2. **上传事件时保存到后端**:
```typescript
const handleJSONUpload = async (file: File) => {
  // ... 现有的解析逻辑 ...
  
  // 保存到后端
  const result = await createEvent(uploadedEvent, category);
  if (result.success) {
    // 更新前端状态
    if (category === 'historical') {
      setHistoricalEvents(prev => [...prev, uploadedEvent]);
    } else {
      setStochasticEvents(prev => [...prev, uploadedEvent]);
    }
    
    alert('Event uploaded and saved successfully!');
  }
};
```

3. **上传 Shapefile 时保存文件**:
```typescript
const handleShapefileUpload = async (files: File[]) => {
  // ... 现有的验证逻辑 ...
  
  // 需要先创建事件记录
  const eventId = prompt('Enter Event ID for this shapefile:');
  if (!eventId) return;
  
  // 上传文件
  const result = await uploadEventFiles(files, eventId, 'shapefile');
  if (result.success) {
    alert(`Shapefile uploaded: ${result.data.files.length} files saved`);
  }
};
```

## 目录结构

```
src/
  app/
    api/
      events/
        route.ts          # 事件 CRUD API
        upload/
          route.ts        # 文件上传 API
  lib/
    api/
      events.ts           # API 工具函数

public/
  data/
    historical-events.json       # 历史事件数据
    stochastic-events-index.json # 随机事件数据
  uploads/
    {eventId}/
      *.shp               # 上传的文件
      *.tiff
      *.bin
      ...
```

## 安全考虑

### 当前实现
- ✅ 文件类型验证
- ✅ 必需字段验证
- ✅ 错误处理

### 生产环境建议
- 🔒 添加身份验证（JWT）
- 🔒 添加权限控制
- 🔒 文件大小限制
- 🔒 文件内容验证
- 🔒 速率限制

## 性能优化

### 当前方案适用于
- 事件数量：< 1000
- 文件总大小：< 1GB
- 并发用户：< 50

### 大规模应用建议
- 使用数据库（PostgreSQL + PostGIS）
- 使用对象存储（AWS S3, MinIO）
- 添加缓存层（Redis）
- 实现分页查询

## 数据库迁移方案（可选）

如果未来需要迁移到数据库，推荐：

### 方案1: PostgreSQL + Prisma
```bash
npm install prisma @prisma/client
npm install -D @prisma/cli
```

### 方案2: MongoDB + Mongoose
```bash
npm install mongoose
```

### 方案3: Supabase（推荐）
- 提供 PostgreSQL + PostGIS
- 内置认证和存储
- 免费层足够开发使用

## 测试 API

### 使用 curl
```bash
# 获取所有事件
curl http://localhost:3000/api/events

# 创建事件
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"event":{"id":"test-001","name":"Test Event","type":"flood"},"category":"historical"}'

# 删除事件
curl -X DELETE "http://localhost:3000/api/events?id=test-001&category=historical"
```

### 使用 Postman/Insomnia
导入以下 URL 进行测试：
- GET: `http://localhost:3000/api/events`
- POST: `http://localhost:3000/api/events`
- PUT: `http://localhost:3000/api/events`
- DELETE: `http://localhost:3000/api/events?id=xxx&category=xxx`

## 故障排查

### 问题：文件保存失败
- 检查 `public/data/` 目录是否存在
- 检查文件写入权限

### 问题：API 返回 404
- 确认 API Routes 文件位置正确
- 检查 Next.js 版本（需要 13+）

### 问题：CORS 错误
- Next.js API Routes 默认同源，无需配置 CORS
- 如果需要外部访问，在 `route.ts` 中添加 CORS 头

## 下一步

1. 修改前端代码集成 API（见下一个文件）
2. 测试所有 API 端点
3. 添加错误处理和加载状态
4. 考虑添加数据验证库（Zod）
5. 实现数据备份功能
