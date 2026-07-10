# TPHK Geocoding 快速参考指南

> 本文档是完整文档 [TPHK_GEOCODING_COMPLETE.md](TPHK_GEOCODING_COMPLETE.md) 的快速参考版本

---

## ⚡ 快速开始

### 1. 环境准备（首次）

```bash
# 1. 安装Anaconda
https://www.anaconda.com/download

# 2. 安装Python依赖
conda activate base
pip install pandas openpyxl requests python-dotenv psycopg2

# 3. 安装PostgreSQL 18 + PostGIS 3.6
https://www.postgresql.org/download/windows/

# 4. 初始化数据库
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
python database/init_db.py
```

### 2. 配置API密钥

编辑 `.env` 文件：
```
GOOGLE_MAPS_API_KEY=你的Google密钥
AMAP_API_KEY=你的高德密钥
DB_PASSWORD=你的数据库密码
```

### 3. 运行Geocoding

```cmd
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
run-resume-geocoding-v2.bat
```

---

## 📁 关键文件位置

```
原始数据:
D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\
└── 2412 巨災統計-承保信息 (香港地區).xlsx (195MB, 474,044条)

输出文件:
D:\Nat Cat Platform\UI_system\scripts\portfolio_management\output\
├── tphk-geocoded-full.json (750MB) ← 最重要的最终结果
└── tphk-geocoding-cache.json (13MB) ← API缓存

核心脚本:
D:\Nat Cat Platform\UI_system\scripts\portfolio_management\
├── geocoding_service.py ← Geocoding服务类
├── data_processing/resume_geocoding_v2.py ← 主处理脚本
└── run-resume-geocoding-v2.bat ← 启动脚本
```

---

## 🎯 常用命令

### 运行Geocoding
```cmd
run-resume-geocoding-v2.bat
```

### 分析结果
```cmd
run-analyze-geocoding.bat
```

### 清理临时文件
```cmd
cleanup-old-files.bat
```

### 初始化数据库
```cmd
python database/init_db.py
```

---

## ⚠️ 常见问题速查

| 问题 | 解决方案 |
|------|----------|
| **API key not configured** | 检查 `.env` 文件，确保有 `load_dotenv()` |
| **No space left on device** | 删除旧checkpoint: `del output\tphk-geocoding-checkpoint_*.json` |
| **JSONDecodeError** | 删除损坏的checkpoint，重新运行 |
| **Anaconda not found** | 检查Anaconda安装路径 |
| **ModuleNotFoundError** | `pip install pandas openpyxl requests python-dotenv psycopg2` |
| **REQUEST_DENIED** | 检查Google API配额和密钥状态 |

---

## 📊 处理结果

- **总记录数**: 474,044 条
- **成功率**: 97.9%
- **失败率**: 2.1%
- **处理时长**: 4-5小时
- **最终文件**: 750MB

---

## 🔄 中断恢复

脚本支持自动断点恢复：

1. **中断**: 按 Ctrl+C
2. **恢复**: 重新运行 `run-resume-geocoding-v2.bat`
3. **自动**: 脚本会找到最新checkpoint继续

---

## 🚀 后续步骤

### 已完成
✅ TPHK承保数据Geocoding (474,044条)

### 待完成
⏳ 数据后处理（楼层、房间号、建造年份提取）
⏳ 香港理赔数据Geocoding
⏳ 澳门承保+理赔数据Geocoding
⏳ 加载到PostgreSQL数据库
⏳ 生成GeoJSON和前端可视化

---

## 📞 技术支持

**完整文档**: [TPHK_GEOCODING_COMPLETE.md](TPHK_GEOCODING_COMPLETE.md)
**文件结构说明**: [FILE_STRUCTURE.md](FILE_STRUCTURE.md)
**项目路径**: `D:\Nat Cat Platform\UI_system\scripts\portfolio_management`

---

**更新时间**: 2025-12-11
**版本**: v1.0
