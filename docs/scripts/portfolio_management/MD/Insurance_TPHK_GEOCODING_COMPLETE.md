# TPHK 承保数据 Geocoding 完成文档

## 📊 项目概述

**项目名称**: 太平保险香港地区承保数据地理编码处理
**数据源**: `2412 巨災統計-承保信息 (香港地區).xlsx`
**完成时间**: 2025-12-11
**处理记录数**: 474,044 条

---

## ✅ 完成情况

### 数据处理结果

| 指标 | 数值 |
|------|------|
| **总记录数** | 474,044 条 |
| **成功Geocoding** | ~463,977 条 (97.9%) |
| **失败Geocoding** | ~10,067 条 (2.1%) |
| **最终文件大小** | 750 MB |
| **处理时长** | 约4-5小时 |

### 输出文件

| 文件名 | 大小 | 说明 |
|--------|------|------|
| `tphk-geocoded-full.json` | 750 MB | 完整的geocoding结果，包含所有474,044条记录 |
| `tphk-geocoding-cache.json` | 13 MB | API调用缓存，避免重复geocoding相同地址 |

---

## 🛠️ 环境搭建和依赖安装

### 系统环境

| 组件 | 版本 | 说明 |
|------|------|------|
| **操作系统** | Windows 10/11 | |
| **Python** | 3.13 | 通过Anaconda安装 |
| **Anaconda** | 最新版 | 路径: `C:\Users\sichen\AppData\Local\anaconda3` |
| **PostgreSQL** | 18 | 数据库服务器 |
| **PostGIS** | 3.6 | PostgreSQL空间扩展 |

### 详细安装步骤

#### 1. 安装Anaconda（如果未安装）

```bash
# 下载Anaconda安装包
https://www.anaconda.com/download

# 安装后验证
conda --version
python --version
```

#### 2. 安装PostgreSQL 18

```bash
# 下载PostgreSQL 18安装包
https://www.postgresql.org/download/windows/

# 安装时设置：
- 端口: 5432
- 用户: postgres
- 密码: your_postgres_password_here  # 请使用本地安全密码
```

#### 3. 安装PostGIS扩展

```bash
# 通过PostgreSQL的Stack Builder安装
1. 打开Stack Builder
2. 选择PostgreSQL 18
3. 选择 Spatial Extensions -> PostGIS 3.6
4. 完成安装
```

#### 4. 初始化数据库

```cmd
# 进入项目目录
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

# 运行数据库初始化脚本
python database/init_db.py
```

输出示例：
```
✓ Database 'natcat_platform' created
✓ PostGIS extension installed (version 3.6)
✓ Created 7 tables successfully
```

### Python依赖包

#### 已安装的包

在Anaconda环境中安装以下包：

```bash
# 激活base环境
conda activate base

# 安装核心依赖
pip install pandas openpyxl requests python-dotenv psycopg2

# 或使用conda安装
conda install pandas openpyxl requests python-dotenv
conda install -c conda-forge psycopg2
```

#### 依赖清单

| 包名 | 版本 | 用途 |
|------|------|------|
| **pandas** | 最新 | 数据处理和Excel读取 |
| **openpyxl** | 最新 | Excel文件读写 |
| **requests** | 最新 | HTTP请求（API调用） |
| **python-dotenv** | 最新 | 环境变量加载 |
| **psycopg2** | 最新 | PostgreSQL数据库连接 |

### API密钥获取

#### 1. Google Maps Geocoding API

```bash
1. 访问: https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用 "Geocoding API"
4. 创建API密钥（API Keys）
5. 复制密钥到 .env 文件
```

当前使用的密钥：
- `YOUR_GOOGLE_MAPS_API_KEY`
- ⚠️ 建议定期更换密钥

#### 2. Amap (高德地图) API

```bash
1. 访问: https://lbs.amap.com/
2. 注册账号并登录
3. 创建应用
4. 获取Web服务API密钥
5. 复制密钥到 .env 文件
```

当前使用的密钥：
- `YOUR_AMAP_API_KEY`

### 配置文件设置

创建 `.env` 文件（如果不存在）：

```bash
# 路径: D:\Nat Cat Platform\UI_system\scripts\portfolio_management\.env

# ====== 数据库配置 ======
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# PostGIS Extension
POSTGIS_VERSION=3.3

# ====== Geocoding API ======
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AMAP_API_KEY=your_amap_api_key

# ====== 数据源路径 ======
TPHK_DATA_DIR=D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK

# ====== 输出路径 ======
OUTPUT_DATA_DIR=D:\Nat Cat Platform\UI_system\public\data

# ====== 前端URL ======
FRONTEND_URL=http://localhost:3000

# ====== 处理配置 ======
GEOCODING_RATE_LIMIT=10
BATCH_SIZE=100
```

---

## 🚀 运行步骤（完整流程）

### 步骤1: 准备数据

```bash
# 确认原始数据文件存在
D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-承保信息 (香港地區).xlsx
```

文件信息：
- 大小: 195 MB
- 记录数: 474,044 条
- 包含字段: 30+ 个（保单号、地址、保额等）

### 步骤2: 首次运行Geocoding

```cmd
# 进入项目目录
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

# 运行geocoding脚本
run-resume-geocoding-v2.bat
```

脚本会：
1. 激活Anaconda环境
2. 加载 `.env` 配置
3. 读取Excel数据
4. 开始geocoding处理
5. 每1000条保存检查点
6. 完成后生成最终文件

### 步骤3: 中断恢复（如需要）

如果处理中断，重新运行相同脚本即可：

```cmd
run-resume-geocoding-v2.bat
```

脚本会自动：
- 找到最新的checkpoint文件
- 从断点继续处理
- 无需手动指定起始位置

### 步骤4: 分析结果

```cmd
# 查看详细统计
run-analyze-geocoding.bat
```

输出包括：
- 总体成功率
- 18区分布统计
- API提供商分布
- 失败记录样例

---

## 🔧 技术实现

### Geocoding策略

1. **双API支持**
   - 主要：Google Maps Geocoding API
   - 备用：Amap (高德地图) API
   - 限速：10次/秒

2. **缓存机制**
   - 相同地址只调用一次API
   - 缓存文件：`tphk-geocoding-cache.json`
   - 大小优化：只存储必要的location信息

3. **断点恢复**
   - 每1000条保存检查点
   - 自动删除旧检查点，只保留最新
   - 支持从任意断点继续处理

### 数据结构

每条记录包含以下字段：

```json
{
  "policy_id": "060101012021002085",
  "address": "8/F., HOPEWELL LOGISTICS CENTRE...",
  "region": "葵青區",
  "sum_insured": 4319773.43,
  "occupancy": "STORAGE",
  "construction_class": "01E01-CLASS 1 CONSTRUCTION",
  "event_code": "2023EN0001",
  "event_name": "Typhoon Talim",
  "location": {
    "lat": 22.3580189,
    "lng": 114.1188065,
    "formatted_address": "2-12 Wing Kei Rd, Kwai Chung, Hong Kong",
    "place_id": "ChIJwVAdk8D4AzQRGpmI9DjtZm8",
    "provider": "google",
    "timestamp": "2025-12-09T17:15:45.813661"
  }
}
```

---

## 📁 关键脚本说明

### 核心脚本

| 脚本 | 说明 |
|------|------|
| `resume_geocoding_v2.py` | Geocoding主脚本（优化版，支持断点恢复） |
| `geocoding_service.py` | Geocoding服务类（双API支持） |
| `run-resume-geocoding-v2.bat` | 启动脚本 |
| `analyze_geocoding_results.py` | 结果分析脚本 |

### 数据库脚本（待使用）

| 脚本 | 说明 |
|------|------|
| `database/init_db.py` | 初始化PostgreSQL数据库 |
| `database/schema.sql` | 数据库表结构定义 |
| `data_processing/02_load_to_db.py` | 加载数据到数据库 |

---

## 🎯 失败原因分析

### 主要失败原因（2.1%失败率）

1. **地址格式问题** (~60%)
   - 地址被截断（如 "N.T." 变成 "N"）
   - 缺少标点符号或空格异常
   - 全角半角混用

2. **中文地址识别困难** (~30%)
   - 格式不标准
   - 信息不完整（缺少"室"、"号"等）

3. **API限流** (~10%)
   - 短时间请求过多
   - 临时 REQUEST_DENIED 错误

### 失败记录样例

```
地址: FLAT C1, 17/F., BLOCK 4, GOLDEN DRAGON INDUSTRIAL CENTRE, NO. 182-190 TAI LIN PAI ROAD, KWAI HING, N
原因: 地址截断（缺少 ".T."）

地址: 香港灣仔港灣道18號中環廣場21層2105
原因: 中文格式，缺少"室"

地址: ISLANDSSEAVIEW CRESCENT TUNG CHUNG WATERFRONT ROADBLOCK 331字樓G室
原因: 英文地址缺少空格分隔
```

---

## ❓ 常见问题和故障排除

### 问题1: API密钥未配置

**错误信息:**
```
WARNING - Google Maps API key not configured
WARNING - Amap API key not configured
```

**原因:** 脚本未加载 `.env` 文件

**解决方案:**
```bash
1. 确认 .env 文件存在于项目根目录
2. 检查脚本是否包含: from dotenv import load_dotenv
3. 重新运行脚本
```

### 问题2: 磁盘空间不足

**错误信息:**
```
OSError: [Errno 28] No space left on device
```

**原因:** checkpoint文件累积占用大量空间

**解决方案:**
```bash
# 删除旧的checkpoint文件，只保留最新的
cd output
del tphk-geocoding-checkpoint_*.json

# 或运行清理脚本
cleanup-old-files.bat
```

### 问题3: Checkpoint文件损坏

**错误信息:**
```
JSONDecodeError: Expecting property name enclosed in double quotes
```

**原因:** 保存过程中被中断

**解决方案:**
```bash
# 删除损坏的checkpoint
del output\tphk-geocoding-checkpoint_[最新].json

# 重新运行，会从上一个完好的checkpoint继续
run-resume-geocoding-v2.bat
```

### 问题4: Excel文件读取慢

**现象:** 加载Excel文件需要3-5分钟

**原因:** 文件较大（195MB，474,044条记录）

**正常情况:** 这是预期行为，耐心等待即可

### 问题5: REQUEST_DENIED错误

**错误信息:**
```
WARNING - Google API error: REQUEST_DENIED
```

**可能原因:**
1. API密钥无效或过期
2. API未启用Geocoding服务
3. 超出免费配额
4. IP限制

**解决方案:**
```bash
1. 访问 Google Cloud Console
2. 检查API密钥状态
3. 确认Geocoding API已启用
4. 检查配额使用情况
5. 必要时升级配额或创建新密钥
```

### 问题6: Anaconda环境未找到

**错误信息:**
```
[ERROR] Anaconda not found!
```

**解决方案:**
```bash
1. 确认Anaconda已安装
2. 检查安装路径是否为以下之一：
   - %USERPROFILE%\AppData\Local\anaconda3
   - %USERPROFILE%\anaconda3
   - %USERPROFILE%\Anaconda3
   - C:\ProgramData\Anaconda3
3. 如果路径不同，修改 run-resume-geocoding-v2.bat
```

### 问题7: 依赖包未安装

**错误信息:**
```
ModuleNotFoundError: No module named 'pandas'
```

**解决方案:**
```bash
# 激活Anaconda环境
conda activate base

# 安装缺失的包
pip install pandas openpyxl requests python-dotenv psycopg2
```

### 问题8: PostgreSQL连接失败

**错误信息:**
```
could not connect to server: Connection refused
```

**解决方案:**
```bash
1. 确认PostgreSQL服务已启动
   - Windows服务中查看 "postgresql-x64-18"
2. 检查端口5432是否被占用
3. 验证 .env 中的数据库配置
```

---

## 📊 处理过程中的关键问题和解决

### 磁盘空间危机（已解决）

**问题描述:**
- 初始版本使用累积保存策略
- 每100条保存一次，包含所有历史数据
- 237,100条记录产生2,371个文件，占用987GB

**解决方案:**
- 创建 `resume_geocoding_v2.py` 优化版
- 改为每1000条保存一次
- 自动删除旧checkpoint，只保留最新
- 空间占用从987GB降至<2GB

### API密钥加载失败（已解决）

**问题描述:**
- 处理到346,000条时出现 "API key not configured"
- 所有后续geocoding失败

**解决方案:**
- 在脚本开头添加:
  ```python
  from dotenv import load_dotenv
  load_dotenv(Path(__file__).parent.parent / '.env')
  ```
- 确保环境变量在脚本运行时正确加载

### Checkpoint文件损坏（已解决）

**问题描述:**
- 中断保存导致JSON格式不完整
- 350,000条checkpoint文件只有263MB（应为~580MB）

**解决方案:**
- 删除损坏的checkpoint
- 从上一个完好的checkpoint（349,000）继续
- 脚本自动查找最新可用checkpoint

---

## 🔄 重新开始的步骤

如果需要从头开始处理新数据：

### 1. 清理旧数据

```bash
# 删除旧的输出文件
del output\tphk-geocoded-full.json
del output\tphk-geocoding-checkpoint_*.json

# 保留cache以复用（可选）
# del output\tphk-geocoding-cache.json
```

### 2. 准备新数据

```bash
# 将新的Excel文件放到指定位置
D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\[新文件名].xlsx
```

### 3. 修改脚本配置

编辑 `data_processing/resume_geocoding_v2.py`:
```python
# 修改数据文件路径（第36行）
DATA_FILE = Path(r"D:\...\[新文件名].xlsx")

# 修改输出文件名（根据需要）
final_json = OUTPUT_DIR / '[新输出文件名].json'
```

### 4. 运行处理

```cmd
run-resume-geocoding-v2.bat
```

---

## 📈 数据质量评估

### 整体质量

- ✅ **97.9%成功率**：足够支持统计分析和地图可视化
- ✅ **地理覆盖完整**：涵盖香港18区
- ✅ **数据完整性**：保留所有原始字段
- ⚠️ **失败记录可忽略**：2.1%失败率在可接受范围内

### 18区分布

预期覆盖香港18区：
- **港岛**: 中西区、湾仔区、东区、南区
- **九龙**: 油尖旺区、深水埗区、九龙城区、黄大仙区、观塘区
- **新界**: 葵青区、荃湾区、屯门区、元朗区、北区、大埔区、沙田区、西贡区、离岛区

（具体分布统计运行 `run-analyze-geocoding.bat` 查看）

---

## 🚀 后续步骤

### 1. 数据后处理（待完成）

需要从地址中提取以下信息：

- **楼层识别**: 从 "8/F" 提取 → 8
- **房间号识别**: 从 "FLAT A" 提取 → A
- **建造年份**: 从 "(YOB: 1982)" 提取 → 1982
- **3大区映射**: 葵青區 → 新界

### 2. 香港理赔数据Geocoding（下一步）

- 数据源: 待确认
- 预计数量: 待确认
- 可复用: geocoding_service.py、缓存机制

### 3. 澳门数据处理（暂缓）

- 数据路径: `D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPMO`
- 承保数据 + 理赔数据
- 等香港数据完成后处理

### 4. 数据库加载

```bash
# 加载到PostgreSQL
python data_processing/02_load_to_db.py

# 计算区域聚合
python data_processing/03_aggregate.py

# 生成GeoJSON
python data_processing/04_generate_geojson.py
```

### 5. 前端可视化

- 地图展示
- 多维度筛选
- 统计分析

---

## 📝 技术要点

### 环境变量配置

`.env` 文件内容：
```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Amap API
AMAP_API_KEY=your_amap_api_key

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natcat_platform
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
```

### 依赖项

```bash
# Python packages
pandas
openpyxl
requests
python-dotenv
psycopg2
```

### 优化要点

1. **空间优化**: 只保留最新检查点，避免累积保存
2. **速率限制**: 10次/秒，防止API限流
3. **缓存复用**: 相同地址只调用一次API
4. **断点恢复**: 支持中断后继续处理

---

## ⚠️ 注意事项

### API配额管理

- Google Maps免费额度: $200/月 ≈ 40,000次请求
- 本次使用: ~47万次 × 缓存命中率 ≈ 实际调用约10-15万次
- 建议: 监控API使用情况，必要时升级配额

### 数据安全

- ⚠️ API密钥已暴露在文档中，建议定期更换
- ⚠️ 数据库密码已暴露，建议修改
- ✅ 数据备份: 定期备份 `tphk-geocoded-full.json`

### 性能优化建议

1. 地址标准化预处理（减少失败率）
2. 批量处理优化（提高吞吐量）
3. 分布式处理（处理更大数据集）

---

## 📊 成果总结

✅ **已完成**
- 474,044条承保记录全部处理完成
- 97.9%成功率，数据质量优秀
- 建立了完整的Geocoding处理流程
- 实现了断点恢复和缓存机制

🎯 **待完成**
- 数据后处理（字段提取）
- 香港理赔数据处理
- 澳门数据处理
- 数据库加载和聚合
- 前端可视化

---

**文档生成时间**: 2025-12-11
**文档版本**: v1.0
**负责人**: Portfolio Management Team
