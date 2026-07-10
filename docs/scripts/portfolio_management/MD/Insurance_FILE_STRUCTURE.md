# Portfolio Management 文件结构说明

## 📁 目录结构

```
portfolio_management/
├── MD/                                 # 文档目录
│   └── TPHK_GEOCODING_COMPLETE.md     # TPHK Geocoding完成文档
│
├── data_processing/                    # 数据处理脚本
│   ├── resume_geocoding_v2.py         # ✅ Geocoding主脚本（优化版）
│   ├── 02_load_to_db.py              # 待用：加载数据到数据库
│   ├── 03_aggregate.py               # 待用：计算区域聚合
│   └── 04_generate_geojson.py        # 待用：生成GeoJSON文件
│
├── database/                          # 数据库相关
│   ├── init_db.py                    # 初始化数据库
│   └── schema.sql                    # 数据库表结构
│
├── api/                              # FastAPI后端（待用）
│   ├── main.py
│   ├── database.py
│   └── routes/
│       ├── policies.py
│       ├── events.py
│       ├── zones.py
│       └── stats.py
│
├── output/                           # 输出数据
│   ├── tphk-geocoded-full.json      # ✅ 最终结果 (750MB)
│   └── tphk-geocoding-cache.json    # ✅ API缓存 (13MB)
│
├── .env                              # 环境变量配置
├── geocoding_service.py              # ✅ Geocoding服务类
├── analyze_geocoding_results.py      # ✅ 结果分析脚本
├── run-resume-geocoding-v2.bat      # ✅ 启动geocoding
├── run-analyze-geocoding.bat        # ✅ 分析结果
├── cleanup-old-files.bat            # 清理脚本
│
├── resume_geocoding_v2.log          # 处理日志
└── geocoding_failures.log           # 失败记录日志
```

---

## ✅ 核心文件说明

### 1. 数据文件（必须保留）

| 文件 | 大小 | 说明 |
|------|------|------|
| `output/tphk-geocoded-full.json` | 750MB | **最重要**：包含474,044条完整geocoding结果 |
| `output/tphk-geocoding-cache.json` | 13MB | API调用缓存，下次处理可复用 |

### 2. 核心脚本（必须保留）

| 文件 | 说明 |
|------|------|
| `geocoding_service.py` | Geocoding服务类（Google + Amap双API） |
| `data_processing/resume_geocoding_v2.py` | 优化版Geocoding主脚本 |
| `analyze_geocoding_results.py` | 结果分析脚本 |
| `run-resume-geocoding-v2.bat` | 启动Geocoding |
| `run-analyze-geocoding.bat` | 分析结果 |

### 3. 配置文件（必须保留）

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量：API密钥、数据库配置 |

### 4. 数据库脚本（待用，保留）

| 文件 | 说明 |
|------|------|
| `database/init_db.py` | 初始化PostgreSQL数据库 |
| `database/schema.sql` | 数据库表结构定义 |
| `data_processing/02_load_to_db.py` | 加载数据到数据库 |
| `data_processing/03_aggregate.py` | 计算区域聚合统计 |
| `data_processing/04_generate_geojson.py` | 生成GeoJSON文件 |

### 5. API后端（待用，保留）

| 目录/文件 | 说明 |
|----------|------|
| `api/` | FastAPI后端代码 |
| `run-api.bat` | 启动API服务器 |

---

## 🗑️ 可删除文件

### 已删除（运行cleanup-old-files.bat后）

| 文件 | 原因 |
|------|------|
| `data_processing/resume_geocoding.py` | 旧版，有bug（累积保存） |
| `data_processing/01_geocode_full.py` | 旧版，不支持断点恢复 |
| `output/tphk-geocoding-checkpoint_474000.json` | 临时检查点文件（750MB），已完成可删 |
| `output/tphk-geocoded-full.csv` | 测试文件 |
| `01_geocode_full.log` | 旧版日志 |
| `resume_geocoding.log` | 旧版日志 |
| `check-environment.bat` | 测试脚本 |
| `check-env-stay-open.bat` | 测试脚本 |
| `quick-check.bat` | 测试脚本 |
| `run-test-pipeline.bat` | 测试脚本 |
| `run-test-pipeline-fixed.bat` | 测试脚本 |
| `run-complete-pipeline.bat` | 旧版pipeline |
| `run-complete-pipeline-fixed.bat` | 旧版pipeline |
| `setup-with-anaconda.bat` | 一次性设置脚本 |

---

## 📊 磁盘空间占用

### 清理前
```
Total: ~42 GB
├── output/tphk-geocoded-full.json: 750 MB
├── output/tphk-geocoding-checkpoint_*.json: ~40 GB (82个文件)
├── output/tphk-geocoding-cache.json: 13 MB
└── 其他: ~1 GB
```

### 清理后
```
Total: ~770 MB
├── output/tphk-geocoded-full.json: 750 MB
├── output/tphk-geocoding-cache.json: 13 MB
└── 脚本和日志: ~7 MB
```

**节省空间**: ~41 GB

---

## 🔄 下次使用指南

### 处理新数据（如香港理赔数据）

1. 复制并修改 `resume_geocoding_v2.py`
2. 修改数据源路径和输出文件名
3. 可复用 `tphk-geocoding-cache.json` 缓存

### 恢复中断的处理

```bash
# 脚本会自动找到最新checkpoint继续
run-resume-geocoding-v2.bat
```

### 分析结果

```bash
# 查看详细统计
run-analyze-geocoding.bat
```

---

## ⚠️ 重要提醒

### 备份建议

定期备份以下文件到外部存储：
- ✅ `output/tphk-geocoded-full.json` (750MB)
- ✅ `output/tphk-geocoding-cache.json` (13MB)
- ✅ `.env` (配置文件)

### 安全建议

- ⚠️ 定期更换API密钥
- ⚠️ 不要将 `.env` 提交到Git仓库
- ⚠️ 数据库密码应定期修改

---

**文档更新时间**: 2025-12-11
**版本**: v1.0
