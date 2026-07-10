# TPUSU数据分层级处理指南

## 📋 目的

将香港2021人口普查的TPUSU (Tertiary Planning Unit & Subunit) 完整数据集,按照行政层级分割为4个独立的shapefile:

1. **PPU** (Primary Planning Unit) - 主要规划区
2. **SPU** (Secondary Planning Unit) - 次要规划区
3. **TPU** (Tertiary Planning Unit) - 第三级规划区
4. **Subunit** - 分区单元 (最细粒度)

---

## 🚀 快速开始

### 步骤1: 安装依赖

选择以下任一方法:

**方法A: 使用geopandas (推荐,功能更强大)**
```bash
pip install geopandas

# 如果出错,先安装依赖:
pip install fiona shapely pyproj rtree
pip install geopandas
```

**方法B: 使用pyshp (轻量,更快)**
```bash
pip install pyshp
```

### 步骤2: 运行脚本

**使用geopandas版本 (推荐)**:
```bash
python split-tpusu-by-hierarchy.py
```

**使用pyshp版本 (简化版)**:
```bash
python split-tpusu-simple.py
```

---

## 📂 输入输出

### 输入文件
```
D:\Nat Cat Platform\Data\Shapefile\
  └─ BoundariesofTertiaryPlanningUnitsSubunitsfor2021PopulationCensus_SHP\
      └─ TPUSU_2021\
          ├─ TPUSU_2021.shp      (主文件)
          ├─ TPUSU_2021.shx      (索引)
          ├─ TPUSU_2021.dbf      (属性表)
          ├─ TPUSU_2021.prj      (投影信息)
          └─ ...
```

### 输出文件
```
D:\Nat Cat Platform\Data\Shapefile\HongKong_Administrative_Levels\
  ├─ HongKong_PPU.shp         (PPU层级)
  ├─ HongKong_SPU.shp         (SPU层级)
  ├─ HongKong_TPU.shp         (TPU层级)
  ├─ HongKong_Subunit.shp     (Subunit层级)
  └─ README.md                (说明文档)
```

---

## 🔧 脚本功能对比

| 功能 | geopandas版本 | pyshp版本 |
|------|---------------|-----------|
| 几何合并 (dissolve) | ✅ 完整支持 | ⚠️ 简化处理 |
| 面积计算 | ✅ | ❌ |
| 统计信息 | ✅ 丰富 | ⚠️ 基本 |
| 处理速度 | ⚠️ 较慢 | ✅ 快速 |
| 依赖复杂度 | ⚠️ 较复杂 | ✅ 简单 |
| 内存占用 | ⚠️ 较高 | ✅ 较低 |

**建议**:
- 生产环境或需要精确几何合并 → 使用 **geopandas版本**
- 快速查看或简单分割 → 使用 **pyshp版本**

---

## 📊 数据层级关系

```
PPU (18个区域)
  └─ SPU (约200个)
      └─ TPU (约292个)
          └─ Subunit (约3000+个)
```

### 层级说明

| 层级 | 英文全称 | 中文 | 用途 |
|------|---------|------|------|
| PPU | Primary Planning Unit | 主要规划区 | 大区划分,对应香港的主要区域 |
| SPU | Secondary Planning Unit | 次要规划区 | 中等粒度,用于区域规划 |
| TPU | Tertiary Planning Unit | 第三级规划区 | 较细粒度,常用于统计分析 |
| Subunit | - | 分区单元 | 最细粒度,最详细的空间划分 |

---

## 💡 使用场景

### 1. 不同尺度的地图展示
```javascript
// 根据地图缩放级别显示不同层级
if (zoom < 10) {
  显示 PPU 层级  // 粗略概览
} else if (zoom < 12) {
  显示 SPU 层级  // 中等详细度
} else if (zoom < 14) {
  显示 TPU 层级  // 详细
} else {
  显示 Subunit   // 最详细
}
```

### 2. 统计数据聚合
```python
# 按不同层级统计人口/经济指标
ppu_stats = aggregate_by_level('PPU')   # 区级统计
tpu_stats = aggregate_by_level('TPU')   # 街道级统计
subunit_stats = aggregate_by_level('Subunit')  # 精细统计
```

### 3. GeoServer发布
```bash
# 将4个层级分别发布到GeoServer
python scripts/batch-publish-geoserver.py

# WMS图层名称:
# - HongKong:HongKong_PPU
# - HongKong:HongKong_SPU
# - HongKong:HongKong_TPU
# - HongKong:HongKong_Subunit
```

---

## 🐛 常见问题

### Q1: 安装geopandas失败
```bash
# Windows用户推荐使用conda
conda install -c conda-forge geopandas

# 或使用预编译的wheel文件
# 下载地址: https://www.lfd.uci.edu/~gohlke/pythonlibs/
pip install Fiona-xxx.whl
pip install GDAL-xxx.whl
pip install geopandas
```

### Q2: 脚本运行时内存不足
```python
# 使用pyshp版本,占用内存更小
python split-tpusu-simple.py
```

### Q3: 输出的shapefile打不开
- 检查是否生成了完整的文件集 (.shp, .shx, .dbf, .prj)
- 使用QGIS验证: QGIS → Add Vector Layer → 选择 .shp 文件
- 检查坐标系统是否正确

### Q4: 几何合并不正确
- geopandas版本使用dissolve进行真正的几何合并
- pyshp版本只保留第一个几何作为代表(简化处理)
- 建议使用geopandas版本获得准确结果

---

## 📚 技术细节

### geopandas版本原理
```python
# 使用dissolve进行几何合并
grouped = gdf.dissolve(by='PPU', as_index=False)

# 这会:
# 1. 按PPU字段分组
# 2. 合并同组内所有几何为一个多边形
# 3. 保留第一条记录的属性
```

### pyshp版本原理
```python
# 简化处理 - 按字段分组,保留代表几何
for key in unique_values:
    indices = find_records_with_key(key)
    first_shape = get_shape(indices[0])  # 只取第一个
    write_shape(first_shape)
```

---

## 🔄 后续步骤

### 1. 上传到GeoServer
```bash
# 编辑批量上传脚本
# scripts/batch-publish-geoserver.py

regions_config = [
    {
        "name": "HongKong",
        "path": "D:/Nat Cat Platform/Data/Shapefile/HongKong_Administrative_Levels"
    }
]

# 运行
python scripts/batch-publish-geoserver.py
```

### 2. 在前端使用
```typescript
// src/app/riskmap/page.tsx
const layers = [
  { name: 'HongKong_PPU', minZoom: 0, maxZoom: 10 },
  { name: 'HongKong_SPU', minZoom: 10, maxZoom: 12 },
  { name: 'HongKong_TPU', minZoom: 12, maxZoom: 14 },
  { name: 'HongKong_Subunit', minZoom: 14, maxZoom: 22 },
];
```

### 3. 数据验证
```bash
# 使用QGIS打开并验证
# 1. 检查记录数是否正确
# 2. 检查几何是否完整
# 3. 检查属性表字段
# 4. 验证坐标系统
```

---

## 📞 技术支持

- **脚本问题**: 查看脚本内注释或运行时错误信息
- **GeoServer上传**: 参考 `MD/GEOSERVER_UPLOAD_GUIDE.md`
- **前端集成**: 参考 `MD/PORTFOLIO_MAP_IMPROVEMENTS.md`

---

**最后更新**: 2025-12-19
