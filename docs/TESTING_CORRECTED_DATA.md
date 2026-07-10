# 测试修正后的地理编码数据 - 使用指南

## 配置说明

我已经在 `PortfolioMap.tsx` 中添加了一个测试配置开关，让你可以轻松切换使用原始数据或修正后的数据。

## 当前配置

**文件位置**: `src/components/portfolio/PortfolioMap.tsx`

**配置开关** (第 40-45 行):
```typescript
// ============================================
// TESTING CONFIGURATION
// ============================================
// Set to true to use the corrected geocoding data
// This fixes 1,630 policies that were incorrectly placed due to geocoding failures
const USE_CORRECTED_GEOCODING_DATA = true;  // ← 当前设置为 true
// ============================================
```

## 如何使用

### 方式1: 测试修正后的数据 (当前配置)

**当前状态**: `USE_CORRECTED_GEOCODING_DATA = true`

**效果**:
- ✅ 使用修正后的数据文件: `tphk-geocoded-portfolio-corrected.json`
- ✅ 1,875个保单的位置已修正
- ✅ 香港会展中心保单现在显示在正确的灣仔區位置
- ✅ 界面上会显示绿色的 "Corrected Data" 标记

**启动应用**:
```bash
npm run dev
```

**验证修正效果**:
1. 打开 http://localhost:3000/portfolio
2. 选择 Portfolio Map 标签
3. 在地图上方会看到绿色的 "Corrected Data" 标记
4. 搜索保单 "060101012024001412" (香港会展中心)
5. 确认标记显示在灣仔區而不是油尖旺區

### 方式2: 对比原始数据

如果你想对比原始数据和修正后的数据:

1. **查看原始数据**:
   - 修改 `PortfolioMap.tsx` 第 45 行
   - 改为: `const USE_CORRECTED_GEOCODING_DATA = false;`
   - 保存文件，应用会自动重新加载
   - 绿色标记会消失
   - 会展中心保单会显示在错误的油尖旺区位置

2. **切换回修正数据**:
   - 改回: `const USE_CORRECTED_GEOCODING_DATA = true;`
   - 保存文件
   - 绿色标记重新出现
   - 会展中心保单显示在正确位置

## 视觉指示器

当使用修正后的数据时，你会在地图控制栏看到:

```
┌─────────────────────────────────────────────┐
│ [Exposure] [Heatmap ▼] [Top 100 ▼] [●Corrected Data] │
└─────────────────────────────────────────────┘
```

- **绿色圆点**: 动画脉冲效果
- **"Corrected Data"**: 表示正在使用修正后的数据
- **仅在香港地区显示**: 其他地区不显示此标记

## 控制台日志

当加载修正后的数据时，控制台会显示:

```
🔧 Using CORRECTED geocoding data (1,875 policies fixed)
✅ Loaded data for HK
```

## 修正内容摘要

### 修正的保单数量
- **总计**: 1,875 个保单
- **受影响分区**: 18 个香港分区
- **主要修正**: TPU 227 (油尖旺区) → 各自正确的分区TPU

### 主要修正案例

| 分区 | 修正数量 | 从 TPU | 到 TPU |
|------|---------|--------|--------|
| 中西區 | 567 | 227 | 112 |
| 東區 | 315 | 227 | 153 |
| 灣仔區 | 182 | 227 | 131 |
| 南區 | 140 | 227 | 173 |
| 元朗區 | 114 | 227 | 524 |

### 香港会展中心保单

**保单号**: 060101012024001412

**修正前**:
- TPU: 227 (油尖旺区)
- 坐标: 22.3193039, 114.1693611
- 位置: 旺角/太子附近 ❌

**修正后**:
- TPU: 131 (灣仔區)
- 坐标: 22.2783586, 114.1711064
- 位置: 灣仔海滨 ✓

## 测试建议

### 1. 基本功能测试
- [ ] 地图正常加载
- [ ] 绿色 "Corrected Data" 标记显示
- [ ] 保单标记显示在地图上
- [ ] 点击标记显示保单详情

### 2. 修正验证测试
- [ ] 搜索会展中心保单 (060101012024001412)
- [ ] 确认显示在灣仔區
- [ ] 查看保单详情，Region 字段显示 "灣仔區"
- [ ] 坐标大约在 22.278, 114.171

### 3. 对比测试
- [ ] 切换到原始数据 (USE_CORRECTED_GEOCODING_DATA = false)
- [ ] 搜索同一保单
- [ ] 确认显示在油尖旺区 (错误位置)
- [ ] 切换回修正数据
- [ ] 确认恢复到正确位置

### 4. 性能测试
- [ ] 加载时间是否正常
- [ ] 地图交互是否流畅
- [ ] 搜索功能是否正常

## 数据文件位置

```
public/data/
├── tphk_portfolio_subset_5000.json          # 原始数据 (5000条样本)
└── tphk-geocoded-portfolio-corrected.json   # 修正后的完整数据 (194,506条)
```

**注意**: 修正后的文件包含完整的194,506条保单数据，比原始样本文件大得多。

## 如果遇到问题

### 问题1: 文件未找到错误

**错误信息**: `Failed to load portfolio dataset (404)`

**解决方案**:
```bash
# 确认修正后的文件存在
ls public/data/tphk-geocoded-portfolio-corrected.json

# 如果不存在，重新生成
node apply-geocoding-corrections.js
```

### 问题2: 绿色标记不显示

**可能原因**:
- 配置开关未设置为 true
- 不在香港地区 (region !== 'hk')
- 应用未重新加载

**解决方案**:
1. 检查 `USE_CORRECTED_GEOCODING_DATA` 是否为 true
2. 确认选择的是香港地区
3. 刷新浏览器页面

### 问题3: 数据加载缓慢

**原因**: 修正后的文件包含完整的194,506条保单

**解决方案**:
- 使用 Top 100/500/1000 采样
- 或者创建一个修正后的样本文件:

```bash
node -e "
const data = require('./public/data/tphk-geocoded-portfolio-corrected.json');
const sample = data.slice(0, 5000);
require('fs').writeFileSync(
  './public/data/tphk-geocoded-portfolio-corrected-sample.json',
  JSON.stringify(sample, null, 2)
);
console.log('Created sample file with 5000 policies');
"
```

然后修改 PortfolioMap.tsx 使用样本文件:
```typescript
filePath = USE_CORRECTED_GEOCODING_DATA
  ? '/data/tphk-geocoded-portfolio-corrected-sample.json'  // 使用样本
  : '/data/tphk_portfolio_subset_5000.json';
```

## 下一步

### 如果测试满意

1. **保留修正后的数据**:
   - 保持 `USE_CORRECTED_GEOCODING_DATA = true`
   - 或者直接替换原文件

2. **替换原文件** (可选):
   ```bash
   # 备份原文件
   copy public\data\tphk_portfolio_subset_5000.json public\data\tphk_portfolio_subset_5000.json.backup

   # 创建修正后的样本文件
   node -e "const data = require('./public/data/tphk-geocoded-portfolio-corrected.json'); require('fs').writeFileSync('./public/data/tphk_portfolio_subset_5000.json', JSON.stringify(data.slice(0, 5000), null, 2));"

   # 改回使用原文件名
   # 修改 PortfolioMap.tsx: USE_CORRECTED_GEOCODING_DATA = false
   ```

### 如果需要调整

1. 查看修正报告: `correction-report.json`
2. 查看详细修正记录: `geocoding-corrections-full.json`
3. 查看完整分析: `GEOCODING_ISSUE_REPORT.md`

## 相关文件

- **配置文件**: `src/components/portfolio/PortfolioMap.tsx`
- **修正后的数据**: `public/data/tphk-geocoded-portfolio-corrected.json`
- **修正脚本**: `apply-geocoding-corrections.js`
- **测试脚本**: `test-corrections.js`
- **分析报告**: `GEOCODING_ISSUE_REPORT.md`
- **修正报告**: `correction-report.json`
- **分区映射**: `district-tpu-mapping.json`

## 技术支持

如有问题，请查看:
1. 控制台日志 (F12 → Console)
2. 网络请求 (F12 → Network)
3. `GEOCODING_ISSUE_REPORT.md` 中的详细说明
