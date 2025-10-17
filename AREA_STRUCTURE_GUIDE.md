# 港澳地区行政区划说明

## 🏛️ 香港 Hong Kong

### Level 1 - Region（地区）
- **Hong Kong**

### Level 2 - Area（区域）
香港分为三大区域：

1. **Hong Kong Island（港岛）**
2. **Kowloon（九龙）**
3. **New Territories（新界）**

### Level 3 - District（地区）
香港共有 **18 个行政区**：

#### 港岛区 (4个)
1. **Central and Western（中西区）**
2. **Wan Chai（湾仔区）**
3. **Eastern（东区）**
4. **Southern（南区）**

#### 九龙区 (5个)
5. **Yau Tsim Mong（油尖旺区）**
6. **Sham Shui Po（深水埗区）**
7. **Kowloon City（九龙城区）**
8. **Wong Tai Sin（黄大仙区）**
9. **Kwun Tong（观塘区）**

#### 新界区 (9个)
10. **Kwai Tsing（葵青区）**
11. **Tsuen Wan（荃湾区）**
12. **Tuen Mun（屯门区）**
13. **Yuen Long（元朗区）**
14. **North（北区）**
15. **Tai Po（大埔区）**
16. **Sha Tin（沙田区）**
17. **Sai Kung（西贡区）**
18. **Islands（离岛区）**

---

## 🏛️ 澳门 Macau

### Level 1 - Region（地区）
- **Macau**

### Level 2 - Area（区域）
澳门分为三大区域：

1. **Macau Peninsula（澳门半岛）**
2. **Taipa（氹仔）**
3. **Coloane（路环）**

### Level 3 - Parish/District（堂区）
澳门共有 **7 个堂区**：

#### 澳门半岛 (5个)
1. **Nossa Senhora de Fátima（花地玛堂区）** - 北区
2. **Santo António（圣安多尼堂区）** - 花王堂区
3. **São Lázaro（圣老楞佐堂区）** - 望德堂区
4. **Sé（大堂区）** - 主教座堂区
5. **São Lourenço（圣老楞佐堂区）** - 风顺堂区

#### 氹仔 (1个)
6. **Our Lady of Carmel（嘉模堂区）**

#### 路环 (1个)
7. **St. Francis Xavier（圣方济各堂区）**

---

## 📊 层级对比

| 层级 | 香港 Hong Kong | 澳门 Macau |
|------|---------------|-----------|
| **Level 1** | Hong Kong | Macau |
| **Level 2** | 3个区域（港岛/九龙/新界） | 3个区域（半岛/氹仔/路环） |
| **Level 3** | 18个行政区 | 7个堂区 |

---

## 🗺️ 地理特点

### 香港
- **总面积**: 约 1,106 km²
- **人口**: 约 750 万
- **特点**: 由香港岛、九龙半岛、新界和262个离岛组成
- **行政区划**: 18 个行政区，每区有区议会

### 澳门
- **总面积**: 约 32.9 km²
- **人口**: 约 68 万
- **特点**: 包括澳门半岛和氹仔、路环两个离岛
- **行政区划**: 7 个堂区，承袭葡萄牙天主教堂区制度

---

## 🎯 系统中的应用

### 筛选逻辑
```
用户操作流程：
1. 选择 Level 1: Hong Kong 或 Macau
2. 根据选择，Level 2 显示对应的 Area
3. 根据 Level 2 选择，Level 3 显示对应的 District/Parish
```

### 代码示例
```typescript
// Level 1 选择
impactAreaLevel1: "Hong Kong" | "Macau" | "all"

// Level 2 选择（依赖 Level 1）
if (impactAreaLevel1 === "Hong Kong") {
  // 可选: Hong Kong Island, Kowloon, New Territories
} else if (impactAreaLevel1 === "Macau") {
  // 可选: Macau Peninsula, Taipa, Coloane
}

// Level 3 选择（依赖 Level 2）
if (impactAreaLevel2 === "Hong Kong Island") {
  // 可选: Central and Western, Wan Chai, Eastern, Southern
} else if (impactAreaLevel2 === "Kowloon") {
  // 可选: Yau Tsim Mong, Sham Shui Po, Kowloon City, Wong Tai Sin, Kwun Tong
}
// ... 依此类推
```

---

## 📝 数据格式示例

### 历史事件示例
```json
{
  "id": "T-2018-1",
  "name": "Typhoon Mangkhut",
  "impactArea": {
    "level1": "Hong Kong",
    "level2": "New Territories",
    "level3": "Tai Po"
  }
}
```

```json
{
  "id": "T-2017-1",
  "name": "Typhoon Hato",
  "impactArea": {
    "level1": "Macau",
    "level2": "Macau Peninsula",
    "level3": "Nossa Senhora de Fátima"
  }
}
```

---

## 🔮 未来扩展

### 大湾区（Greater Bay Area）
如果未来需要扩展到整个粤港澳大湾区：

**Level 1 - Region（地区）**:
- Hong Kong
- Macau
- Guangzhou（广州）
- Shenzhen（深圳）
- Zhuhai（珠海）
- Foshan（佛山）
- Dongguan（东莞）
- Zhongshan（中山）
- Jiangmen（江门）
- Huizhou（惠州）
- Zhaoqing（肇庆）

**Level 2 - Area（区域）**:
- 各市的区划（例如：广州的天河区、越秀区等）

**Level 3 - District（地区）**:
- 更细分的街道/社区

### 东南亚地区
- Singapore（新加坡）
- Bangkok（曼谷）
- Manila（马尼拉）
- Jakarta（雅加达）
- 等等...

---

## 💡 设计考虑

1. **统一性**: 虽然香港澳门的行政体系不同，但统一使用 Level 1/2/3 概念便于系统扩展

2. **灵活性**: 三级结构可以适应不同地区的行政划分
   - 有些地区可能只有 2 级
   - 有些地区可能需要 4 级甚至更多

3. **可扩展性**: 
   - 数据库中使用字符串存储，不限制具体值
   - 前端动态加载选项，易于添加新地区

4. **国际化**: 
   - 使用英文作为主要标识
   - 可以添加多语言支持（中文、葡文、英文等）

---

## 📚 参考资料

- [香港18区地图](https://www.gov.hk/tc/about/abouthk/factsheets/docs/district_councils.pdf)
- [澳门堂区介绍](https://www.gov.mo/zh-hant/about-macao/)
- [香港地理数据中心](https://portal.csdi.gov.hk/)
- [澳门地理信息系统](https://www.dscc.gov.mo/)
