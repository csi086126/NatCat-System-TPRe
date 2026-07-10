# Portfolio Management System - 完整实施方案

## 📋 项目概述

基于 PostgreSQL + PostGIS 的企业级再保险组合管理系统。

### **核心功能**
1. Zone Accumulation（按分区聚合TSI）
2. 地图热力图可视化
3. Limit Monitoring（容量监控）
4. 历史事件关联分析
5. 导出报告

### **技术栈**
- **数据库**: PostgreSQL 18 + PostGIS 3.3
- **后端API**: Python FastAPI
- **前端**: Next.js + TypeScript + Leaflet
- **数据处理**: Python + Pandas + GeoPandas

---

## 🗂️ 项目结构

```
scripts/portfolio_management/
├── README.md                      # 本文件
├── requirements.txt               # Python依赖
├── .env.example                   # 环境变量模板
│
├── config/                        # 配置文件
│   ├── database.py               # 数据库配置
│   ├── api_config.py             # API配置
│   └── districts.json            # 香港18区配置
│
├── database/                      # 数据库相关
│   ├── schema.sql                # 数据库结构
│   ├── init_db.py                # 初始化数据库
│   ├── models.py                 # SQLAlchemy模型
│   └── migrations/               # 数据库迁移
│
├── data_processing/               # 数据处理脚本
│   ├── 01_geocode_full.py        # 完整geocoding
│   ├── 02_load_to_db.py          # 导入数据库
│   ├── 03_aggregate.py           # 数据聚合
│   ├── 04_generate_geojson.py    # 生成GeoJSON
│   └── 05_incremental_update.py  # 增量更新
│
├── api/                           # FastAPI后端
│   ├── main.py                   # API入口
│   ├── routes/                   # API路由
│   │   ├── portfolio.py         # 组合查询
│   │   ├── zones.py             # 分区统计
│   │   └── limits.py            # 限额管理
│   ├── services/                 # 业务逻辑
│   │   ├── geocoding.py         # Geocoding服务
│   │   ├── aggregation.py       # 聚合计算
│   │   └── export.py            # 导出服务
│   └── schemas/                  # Pydantic模型
│
├── utils/                         # 工具函数
│   ├── district_extractor.py    # 分区提取
│   ├── logger.py                # 日志工具
│   └── validators.py            # 数据验证
│
└── scripts/                       # 批处理脚本
    ├── run_full_pipeline.bat    # 一键运行完整流程
    ├── start_api_server.bat     # 启动API服务器
    └── deploy.bat               # 部署脚本
```

---

## 🚀 快速开始

### **1. 安装 PostgreSQL + PostGIS**

#### Windows:
```bash
# 下载 PostgreSQL 15
https://www.postgresql.org/download/windows/

# 安装过程中记住密码
# 默认端口: 5432
# 默认用户: postgres

# 安装后，启用 PostGIS 扩展
psql -U postgres
CREATE EXTENSION postgis;
```

### **2. 安装 Python 依赖**
```bash
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
pip install -r requirements.txt
```

### **3. 配置环境变量**
```bash
copy .env.example .env
# 编辑 .env，填入数据库连接信息
```

### **4. 初始化数据库**
```bash
python database/init_db.py
```

### **5. 运行完整数据处理流程**
```bash
scripts\run_full_pipeline.bat
```

### **6. 启动API服务器**
```bash
scripts\start_api_server.bat
```

### **7. 前端集成**
前端通过 API 端点访问数据：
```
http://localhost:8000/api/portfolio/zones
http://localhost:8000/api/portfolio/query
http://localhost:8000/api/limits/monitor
```

---

## 📊 数据库设计

### **主表：policies（保单表）**
存储所有geocoded保单数据

### **聚合表：zone_accumulations（分区累积表）**
预计算的分区统计数据

### **配置表：zone_limits（分区限额表）**
用户设置的分区容量限制

### **索引：**
- 地理空间索引（PostGIS）
- 分区索引
- 时间索引

---

## 🔄 数据流程

### **初始化流程**
```
Excel数据
  → Geocoding (Google Maps API)
  → PostgreSQL + PostGIS
  → 聚合计算
  → API暴露
```

### **增量更新流程**
```
新保单数据
  → 实时Geocoding
  → 插入数据库
  → 增量更新聚合表
  → 前端自动刷新
```

---

## 🎯 API端点设计

### **查询端点**
```
GET  /api/portfolio/all              # 获取全部数据（分页）
POST /api/portfolio/query            # 复杂筛选查询
GET  /api/portfolio/zones            # 分区统计
GET  /api/portfolio/zones/{region}   # 特定分区详情
```

### **聚合端点**
```
GET  /api/aggregations/by-region     # 按分区聚合
GET  /api/aggregations/by-occupancy  # 按占用聚合
GET  /api/aggregations/by-event      # 按事件聚合
```

### **限额管理端点**
```
GET    /api/limits/all               # 获取所有限额
POST   /api/limits/set               # 设置限额
GET    /api/limits/monitor           # 监控状态
DELETE /api/limits/{id}              # 删除限额
```

### **实时更新端点**
```
POST /api/portfolio/add              # 新增保单（实时geocoding）
PUT  /api/portfolio/{id}             # 更新保单
```

---

## 📈 前端集成示例

```typescript
// 1. 获取分区统计
const zoneStats = await fetch('/api/portfolio/zones')
  .then(r => r.json())

// 2. 复杂查询
const filtered = await fetch('/api/portfolio/query', {
  method: 'POST',
  body: JSON.stringify({
    region: '葵青區',
    sum_insured_min: 1000000,
    event_name: '台风山竹',
    occupancy: ['STORAGE', 'RETAIL']
  })
})

// 3. 设置限额
await fetch('/api/limits/set', {
  method: 'POST',
  body: JSON.stringify({
    region: '葵青區',
    limit: 500000000,
    alert_threshold: 0.8
  })
})

// 4. 监控状态
const monitoring = await fetch('/api/limits/monitor')
  .then(r => r.json())
// 返回: { region: '葵青區', utilization: 0.85, status: 'warning' }
```

---

## 🔧 维护和运维

### **定期任务**
- 每日：备份数据库
- 每周：重新计算聚合表
- 每月：数据质量检查

### **监控指标**
- API响应时间
- 数据库查询性能
- Geocoding成功率
- 磁盘空间使用

---

## 📝 下一步计划

### **Phase 1: 基础设施（本周）**
- [x] 创建项目结构
- [ ] 安装PostgreSQL + PostGIS
- [ ] 编写数据库Schema
- [ ] 完整Geocoding脚本
- [ ] 数据导入脚本

### **Phase 2: API开发（下周）**
- [ ] FastAPI基础框架
- [ ] 查询端点
- [ ] 聚合端点
- [ ] 限额管理端点

### **Phase 3: 前端集成（后续）**
- [ ] Zone Accumulation界面
- [ ] 地图可视化
- [ ] Limit Monitoring界面
- [ ] 导出功能

---

**创建时间**: 2025-12-05
**版本**: 1.0 Enterprise
**作者**: Claude + User
