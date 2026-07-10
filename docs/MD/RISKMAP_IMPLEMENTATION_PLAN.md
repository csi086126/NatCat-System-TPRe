# Risk Map 实施计划
## 基于慕尼黑再保险标准的分阶段实施方案

**制定日期**: 2025-10-17  
**项目目标**: 打造符合再保险行业标准的多灾种风险评估系统

---

## 🎯 第一阶段：评分系统重构（优先级：高）

### 目标
将现有的 0-100 评分制改为符合行业标准的 0-10 评分制，并实现基于重现期的科学评分方法

### 任务清单

#### 1.1 修改评分数据结构
```typescript
// 修改 riskConfig state
const [riskConfig, setRiskConfig] = useState({
  // 单灾种得分 (改为0-10)
  flood: { score: 0, zone: 'Zone 0', returnPeriod: null, depth: null },
  typhoon: { score: 0, zone: 'Zone 0', intensity: null, frequency: null },
  rainstorm: { score: 0, zone: 'Zone 0', returnPeriod: null, rainfall: null },
  stormSurge: { score: 0, zone: 'Zone 0', returnPeriod: null, height: null },
  landslide: { score: 0, zone: 'Zone 0', riskLevel: null, rainfall: null },
  
  // 综合得分 (0-10)
  overallScore: 0,
  overallDefended: 0, // 考虑防御措施后的得分
  
  // 风险等级
  riskLevel: 'No Hazard', // No Hazard / Very Low / Low / Medium / High / Extreme
  
  // 情景分析结果
  scenarios: [],
  criticalScenario: null,
});
```

#### 1.2 实现新的评分函数
```typescript
// 文件位置: src/lib/riskScoring.ts

// 1. 通用风险等级判定
function getRiskLevel(score: number): string {
  if (score === 0) return 'No Hazard';
  if (score <= 2) return 'Very Low';
  if (score <= 4) return 'Low';
  if (score <= 6) return 'Medium';
  if (score <= 8) return 'High';
  return 'Extreme';
}

// 2. 洪水评分（基于重现期+深度）
function calculateFloodScore(depths: {
  '20yr': number,
  '50yr': number,
  '100yr': number,
  '200yr': number,
  '500yr': number
}): FloodRiskResult {
  let maxScore = 0;
  let zone = 'Zone 0';
  let criticalPeriod = null;
  let criticalDepth = null;
  
  // 检查各重现期，取最严重情况
  if (depths['20yr'] > 4) {
    maxScore = 10; zone = 'Zone 8'; criticalPeriod = '20yr'; criticalDepth = depths['20yr'];
  } else if (depths['20yr'] > 2) {
    maxScore = 9; zone = 'Zone 7'; criticalPeriod = '20yr'; criticalDepth = depths['20yr'];
  } else if (depths['20yr'] > 0) {
    maxScore = 7; zone = 'Zone 5'; criticalPeriod = '20yr'; criticalDepth = depths['20yr'];
  } else if (depths['50yr'] > 2) {
    maxScore = 9; zone = 'Zone 7'; criticalPeriod = '50yr'; criticalDepth = depths['50yr'];
  } else if (depths['50yr'] > 0) {
    maxScore = 6; zone = 'Zone 4'; criticalPeriod = '50yr'; criticalDepth = depths['50yr'];
  } else if (depths['100yr'] > 2) {
    maxScore = 8; zone = 'Zone 6'; criticalPeriod = '100yr'; criticalDepth = depths['100yr'];
  } else if (depths['100yr'] > 0) {
    maxScore = 5; zone = 'Zone 3'; criticalPeriod = '100yr'; criticalDepth = depths['100yr'];
  } else if (depths['200yr'] > 0) {
    maxScore = 4; zone = 'Zone 2'; criticalPeriod = '200yr'; criticalDepth = depths['200yr'];
  } else if (depths['500yr'] > 0) {
    maxScore = 3; zone = 'Zone 1'; criticalPeriod = '500yr'; criticalDepth = depths['500yr'];
  }
  
  return {
    score: maxScore,
    level: getRiskLevel(maxScore),
    zone,
    returnPeriod: criticalPeriod,
    depth: criticalDepth,
    allDepths: depths
  };
}

// 3. 台风评分（基于强度+频率）
function calculateTyphoonScore(
  intensity: 'SuperTY' | 'STY' | 'TY' | 'STS' | 'TS' | 'TD' | null,
  trackDensity: number
): TyphoonRiskResult {
  let baseScore = 0;
  let zone = 'Zone 0';
  
  switch(intensity) {
    case 'SuperTY': baseScore = 10; zone = 'Zone 6'; break;
    case 'STY': baseScore = 9; zone = 'Zone 5'; break;
    case 'TY': baseScore = 7; zone = 'Zone 4'; break;
    case 'STS': baseScore = 6; zone = 'Zone 3'; break;
    case 'TS': baseScore = 4; zone = 'Zone 2'; break;
    case 'TD': baseScore = 2; zone = 'Zone 1'; break;
    default: baseScore = 0;
  }
  
  // 频率调整（历史路径密度）
  const frequencyFactor = Math.min(trackDensity / 5, 1); // 归一化
  const finalScore = Math.round(baseScore * (0.7 + 0.3 * frequencyFactor));
  
  return {
    score: finalScore,
    level: getRiskLevel(finalScore),
    zone,
    intensity,
    frequency: trackDensity
  };
}

// 4. 暴雨评分（类似洪水）
function calculateRainstormScore(rainfall: {
  '20yr': number,
  '50yr': number,
  '100yr': number,
  '200yr': number,
  '500yr': number
}): RainstormRiskResult {
  // 实现逻辑类似 calculateFloodScore
}

// 5. 风暴潮评分
function calculateStormSurgeScore(
  distanceToCoast: number,
  surgeHeights: {...}
): StormSurgeRiskResult {
  // 如果距离海岸>50km，直接返回0分
  if (distanceToCoast > 50000) {
    return { score: 0, level: 'No Hazard', zone: 'Zone 0' };
  }
  // 否则类似洪水评分
}

// 6. 滑坡评分
function calculateLandslideScore(
  geoRisk: 'high' | 'medium' | 'low',
  rainfallTrigger: number
): LandslideRiskResult {
  let baseScore = 0;
  let zone = 'Zone 0';
  
  switch(geoRisk) {
    case 'high': baseScore = 8; zone = 'Zone 4'; break;
    case 'medium': baseScore = 5; zone = 'Zone 3'; break;
    case 'low': baseScore = 2; zone = 'Zone 1'; break;
  }
  
  // 降雨触发因子
  if (rainfallTrigger > 300) baseScore = Math.min(baseScore + 2, 10);
  else if (rainfallTrigger > 200) baseScore = Math.min(baseScore + 1, 10);
  
  return {
    score: baseScore,
    level: getRiskLevel(baseScore),
    zone,
    geoRisk,
    rainfallTrigger
  };
}

// 7. 综合评分（加权平均）
function calculateOverallScore(scores: {
  flood: number,
  typhoon: number,
  rainstorm: number,
  stormSurge: number,
  landslide: number
}): number {
  const weights = {
    flood: 0.30,
    typhoon: 0.25,
    rainstorm: 0.20,
    stormSurge: 0.15,
    landslide: 0.10
  };
  
  const overall = 
    scores.flood * weights.flood +
    scores.typhoon * weights.typhoon +
    scores.rainstorm * weights.rainstorm +
    scores.stormSurge * weights.stormSurge +
    scores.landslide * weights.landslide;
  
  return Math.round(overall * 10) / 10; // 保留1位小数
}

// 8. 考虑防御措施的得分
function calculateDefendedScore(
  undefendedScore: number,
  defenseLevel: 'none' | 'standard' | 'high' | 'extreme'
): number {
  const factors = {
    none: 1.0,
    standard: 0.7,
    high: 0.5,
    extreme: 0.3
  };
  
  return Math.round(undefendedScore * factors[defenseLevel] * 10) / 10;
}
```

#### 1.3 更新查询结果显示
```tsx
// src/app/riskmap/page.tsx

{queryResult && (
  <div className="mt-3 p-4 bg-white rounded-lg border-2 border-purple-200">
    {/* 位置信息 */}
    <div className="mb-4">
      <p className="font-bold text-lg">{queryResult.address}</p>
      <p className="text-sm text-gray-600">
        Lat: {queryResult.latitude}, Lon: {queryResult.longitude}
      </p>
    </div>
    
    {/* Overall Score - 大卡片 */}
    <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Overall Risk Score</p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-red-600">
              {riskConfig.overallScore.toFixed(1)}
            </span>
            <span className="text-xl text-gray-500">/ 10</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`
            px-3 py-1 rounded-full text-sm font-bold
            ${getRiskColor(riskConfig.riskLevel)}
          `}>
            {riskConfig.riskLevel}
          </span>
          {riskConfig.overallDefended !== riskConfig.overallScore && (
            <p className="text-xs text-gray-600 mt-2">
              Defended: {riskConfig.overallDefended.toFixed(1)}
            </p>
          )}
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getProgressBarGradient(riskConfig.overallScore)}`}
          style={{ width: `${(riskConfig.overallScore / 10) * 100}%` }}
        />
      </div>
    </div>
    
    {/* 各灾种得分 */}
    <div className="space-y-3">
      {/* Flood */}
      <div className="flex items-center gap-3">
        <div className="w-24 text-sm font-semibold">Flood</div>
        <div className="flex-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500"
              style={{ width: `${(riskConfig.flood.score / 10) * 100}%` }}
            />
          </div>
        </div>
        <div className="w-16 text-right">
          <span className="font-bold">{riskConfig.flood.score.toFixed(1)}</span>
        </div>
        <div className="w-24 text-right text-xs">
          <span className={`px-2 py-1 rounded ${getRiskColor(riskConfig.flood.level)}`}>
            {riskConfig.flood.zone}
          </span>
        </div>
      </div>
      
      {/* Typhoon */}
      <div className="flex items-center gap-3">
        <div className="w-24 text-sm font-semibold">Typhoon</div>
        <div className="flex-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500"
              style={{ width: `${(riskConfig.typhoon.score / 10) * 100}%` }}
            />
          </div>
        </div>
        <div className="w-16 text-right">
          <span className="font-bold">{riskConfig.typhoon.score.toFixed(1)}</span>
        </div>
        <div className="w-24 text-right text-xs">
          <span className={`px-2 py-1 rounded ${getRiskColor(riskConfig.typhoon.level)}`}>
            {riskConfig.typhoon.zone}
          </span>
        </div>
      </div>
      
      {/* Rainstorm, Storm Surge, Landslide 类似 */}
    </div>
    
    {/* 详细信息展开 */}
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold text-blue-600">
        📊 View Detailed Scoring Breakdown
      </summary>
      <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2">
        <p><strong>Flood:</strong> {riskConfig.flood.returnPeriod} return period, 
           Depth: {riskConfig.flood.depth}m</p>
        <p><strong>Typhoon:</strong> Intensity: {riskConfig.typhoon.intensity}, 
           Track density: {riskConfig.typhoon.frequency}/10km²</p>
        {/* 其他灾种详情 */}
      </div>
    </details>
  </div>
)}
```

### 时间估计
- **评分函数重构**: 2-3天
- **UI更新**: 1-2天
- **测试验证**: 1天
- **总计**: 4-6天

---

## 🔌 第二阶段：WMS数据集成（优先级：高）

### 目标
接入真实的WMS数据，实现基于地理坐标的实时风险查询

### 任务清单

#### 2.1 实现 WMS GetFeatureInfo 查询
```typescript
// src/lib/wmsQuery.ts

interface WMSQueryParams {
  lat: number;
  lon: number;
  layerName: string;
  attribute?: string; // 查询的属性名，如 'depth', 'intensity'
}

async function queryWMSFeature(params: WMSQueryParams): Promise<number | null> {
  const { lat, lon, layerName, attribute = 'GRAY_INDEX' } = params;
  
  // 1. 构建 GetFeatureInfo 请求
  const url = new URL('http://143.89.22.7:8090/geoserver/wms');
  url.searchParams.append('SERVICE', 'WMS');
  url.searchParams.append('VERSION', '1.1.1');
  url.searchParams.append('REQUEST', 'GetFeatureInfo');
  url.searchParams.append('LAYERS', layerName);
  url.searchParams.append('QUERY_LAYERS', layerName);
  url.searchParams.append('INFO_FORMAT', 'application/json');
  url.searchParams.append('FEATURE_COUNT', '1');
  url.searchParams.append('X', '50'); // 像素坐标（根据bbox计算）
  url.searchParams.append('Y', '50');
  url.searchParams.append('SRS', 'EPSG:4326');
  url.searchParams.append('WIDTH', '101');
  url.searchParams.append('HEIGHT', '101');
  
  // 2. 计算查询窗口（点周围小范围）
  const buffer = 0.001; // 约100米
  const bbox = `${lon-buffer},${lat-buffer},${lon+buffer},${lat+buffer}`;
  url.searchParams.append('BBOX', bbox);
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const value = data.features[0].properties[attribute];
      return parseFloat(value) || 0;
    }
    return 0; // 无数据返回0
  } catch (error) {
    console.error(`WMS query failed for ${layerName}:`, error);
    return null; // 查询失败返回null
  }
}

// 批量查询所有重现期图层
async function queryAllReturnPeriods(
  lat: number,
  lon: number,
  hazardType: 'flood' | 'rainstorm' | 'stormsurge'
): Promise<{
  '20yr': number,
  '50yr': number,
  '100yr': number,
  '200yr': number,
  '500yr': number
}> {
  const prefix = hazardType === 'flood' ? 'COP:flood_' : 
                 hazardType === 'rainstorm' ? 'COP:rainstorm_' :
                 'COP:stormsurge_';
  
  const [v20, v50, v100, v200, v500] = await Promise.all([
    queryWMSFeature({ lat, lon, layerName: `${prefix}20yr` }),
    queryWMSFeature({ lat, lon, layerName: `${prefix}50yr` }),
    queryWMSFeature({ lat, lon, layerName: `${prefix}100yr` }),
    queryWMSFeature({ lat, lon, layerName: `${prefix}200yr` }),
    queryWMSFeature({ lat, lon, layerName: `${prefix}500yr` }),
  ]);
  
  return {
    '20yr': v20 || 0,
    '50yr': v50 || 0,
    '100yr': v100 || 0,
    '200yr': v200 || 0,
    '500yr': v500 || 0,
  };
}
```

#### 2.2 集成地理编码API
```typescript
// src/lib/geocoding.ts

async function geocodeAddress(address: string): Promise<{
  latitude: number,
  longitude: number,
  displayName: string
} | null> {
  try {
    // 使用 Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

// 反向地理编码
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch (error) {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}
```

#### 2.3 更新查询流程
```typescript
// src/app/riskmap/page.tsx

async function handleRiskQuery() {
  if (!searchQuery.trim()) {
    alert('Please enter an address or coordinates');
    return;
  }
  
  setIsQuerying(true);
  
  try {
    // 1. 地理编码
    const geocodeResult = await geocodeAddress(searchQuery);
    if (!geocodeResult) {
      alert('Address not found');
      return;
    }
    
    const { latitude, longitude, displayName } = geocodeResult;
    
    // 2. 并行查询所有灾种数据
    const [floodDepths, rainstormRainfall, typhoonData, surgeHeights, landslideRisk] = 
      await Promise.all([
        queryAllReturnPeriods(latitude, longitude, 'flood'),
        queryAllReturnPeriods(latitude, longitude, 'rainstorm'),
        queryTyphoonRisk(latitude, longitude),
        queryAllReturnPeriods(latitude, longitude, 'stormsurge'),
        queryLandslideRisk(latitude, longitude),
      ]);
    
    // 3. 计算各灾种得分
    const floodScore = calculateFloodScore(floodDepths);
    const rainstormScore = calculateRainstormScore(rainstormRainfall);
    const typhoonScore = calculateTyphoonScore(typhoonData.intensity, typhoonData.frequency);
    const surgeScore = calculateStormSurgeScore(typhoonData.distanceToCoast, surgeHeights);
    const landslideScore = calculateLandslideScore(landslideRisk.level, rainstormRainfall['100yr']);
    
    // 4. 计算综合得分
    const overallScore = calculateOverallScore({
      flood: floodScore.score,
      typhoon: typhoonScore.score,
      rainstorm: rainstormScore.score,
      stormSurge: surgeScore.score,
      landslide: landslideScore.score
    });
    
    // 5. 更新状态
    setRiskConfig({
      flood: floodScore,
      typhoon: typhoonScore,
      rainstorm: rainstormScore,
      stormSurge: surgeScore,
      landslide: landslideScore,
      overallScore,
      overallDefended: calculateDefendedScore(overallScore, 'none'),
      riskLevel: getRiskLevel(overallScore)
    });
    
    setQueryResult({
      address: displayName,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Query failed:', error);
    alert('Risk query failed. Please try again.');
  } finally {
    setIsQuerying(false);
  }
}
```

### 时间估计
- **WMS查询实现**: 2天
- **地理编码集成**: 1天
- **查询流程集成**: 2天
- **测试调试**: 1天
- **总计**: 6天

---

## 📄 第三阶段：PDF报告生成（优先级：中）

### 目标
生成符合再保险行业标准的专业PDF报告

### 任务清单

#### 3.1 设计报告模板组件
```typescript
// src/lib/reportGenerator.ts

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  location: { address: string; latitude: number; longitude: number };
  riskScores: {...};
  mapSnapshot: string; // base64 image
  satellite Image: string;
  metadata: {...};
}

async function generateRiskReport(data: ReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210; // A4宽度
  const pageHeight = 297; // A4高度
  
  // === Page 1: 封面 ===
  pdf.setFillColor(30, 58, 138); // 深蓝色背景
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.text('Asset Risk Report', pageWidth / 2, 80, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.text(`Lat: ${data.location.latitude}, Lon: ${data.location.longitude}`, 
           pageWidth / 2, 110, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text(new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }), pageWidth / 2, 130, { align: 'center' });
  
  // 添加地图预览
  if (data.mapSnapshot) {
    pdf.addImage(data.mapSnapshot, 'PNG', 20, 150, 170, 120);
  }
  
  // === Page 2: 目录 ===
  pdf.addPage();
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.text('Table of Contents', 20, 30);
  
  pdf.setFontSize(12);
  const toc = [
    { title: 'Asset Info', page: 3 },
    { title: 'Risk Scores', page: 4 },
    { title: 'Natural Hazards', page: 5 },
    { title: 'Natural Hazards (Legends)', page: 7 },
  ];
  
  let y = 50;
  toc.forEach(item => {
    pdf.text(`${item.title}${'.'repeat(50)}${item.page}`, 20, y);
    y += 10;
  });
  
  // === Page 3: Asset Info ===
  pdf.addPage();
  pdf.setFontSize(20);
  pdf.setTextColor(220, 38, 38); // 红色标题
  pdf.text('Asset Info', 20, 30);
  
  if (data.satelliteImage) {
    pdf.addImage(data.satelliteImage, 'PNG', 20, 40, 170, 120);
  }
  
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  y = 170;
  pdf.text(`Latitude: ${data.location.latitude.toFixed(6)}`, 30, y); y += 8;
  pdf.text(`Longitude: ${data.location.longitude.toFixed(6)}`, 30, y); y += 8;
  pdf.text(`Elevation: ${data.metadata.elevation || 'N/A'} m`, 30, y); y += 8;
  pdf.text(`Distance to Coast: ${data.metadata.distanceToCoast || 'N/A'} m`, 30, y);
  
  // === Page 4: Risk Scores ===
  pdf.addPage();
  pdf.setFontSize(20);
  pdf.setTextColor(220, 38, 38);
  pdf.text('Risk Scores', 20, 30);
  
  // Overall Score - 大卡片
  pdf.setFillColor(254, 226, 226); // 浅红色背景
  pdf.roundedRect(20, 40, 170, 50, 5, 5, 'F');
  
  pdf.setFontSize(14);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Overall (Defended)', 30, 55);
  
  pdf.setFontSize(48);
  pdf.setTextColor(220, 38, 38);
  pdf.text(data.riskScores.overallScore.toFixed(1), 30, 80);
  
  pdf.setFontSize(18);
  pdf.setTextColor(249, 115, 22); // 橙色
  pdf.text(data.riskScores.riskLevel, 120, 70);
  
  // 各灾种得分 - 进度条
  const hazards = [
    { name: 'Typhoon', score: data.riskScores.typhoon.score, color: [147, 51, 234] },
    { name: 'Rainstorm', score: data.riskScores.rainstorm.score, color: [59, 130, 246] },
    { name: 'Flood', score: data.riskScores.flood.score, color: [34, 197, 94] },
    { name: 'Storm Surge', score: data.riskScores.stormSurge.score, color: [14, 165, 233] },
    { name: 'Landslide', score: data.riskScores.landslide.score, color: [168, 85, 247] },
  ];
  
  y = 110;
  hazards.forEach(hazard => {
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(hazard.name, 30, y);
    
    // 进度条背景
    pdf.setFillColor(229, 231, 235);
    pdf.rect(80, y - 4, 80, 6, 'F');
    
    // 进度条填充
    pdf.setFillColor(...hazard.color);
    pdf.rect(80, y - 4, (hazard.score / 10) * 80, 6, 'F');
    
    // 得分数字
    pdf.text(hazard.score.toFixed(1), 165, y);
    
    y += 15;
  });
  
  // === Page 5-6: Natural Hazards 详细说明 ===
  // (根据慕再模板添加详细的Zone说明)
  
  // === Page 7-8: Legends ===
  // (添加图例和方法论说明)
  
  // 保存PDF
  pdf.save(`Risk_Report_${data.location.latitude}_${data.location.longitude}.pdf`);
}
```

#### 3.2 添加地图截图功能
```typescript
// 获取当前地图视图的截图
async function captureMapSnapshot(): Promise<string> {
  const mapContainer = document.querySelector('.leaflet-container');
  if (!mapContainer) return '';
  
  const canvas = await html2canvas(mapContainer as HTMLElement, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f3f4f6'
  });
  
  return canvas.toDataURL('image/png');
}

// 获取卫星影像（使用Google Maps Static API或Mapbox）
async function fetchSatelliteImage(lat: number, lon: number): Promise<string> {
  // 使用Mapbox Static Images API
  const mapboxToken = 'YOUR_MAPBOX_TOKEN';
  const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},15,0/600x400@2x?access_token=${mapboxToken}`;
  
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
```

#### 3.3 添加下载按钮
```tsx
// src/app/riskmap/page.tsx

<Button 
  onClick={async () => {
    setIsGeneratingReport(true);
    try {
      const mapSnapshot = await captureMapSnapshot();
      const satelliteImage = await fetchSatelliteImage(
        queryResult.latitude, 
        queryResult.longitude
      );
      
      await generateRiskReport({
        location: queryResult,
        riskScores: riskConfig,
        mapSnapshot,
        satelliteImage,
        metadata: {
          elevation: 90, // 从elevation API获取
          distanceToCoast: 48394, // 从WMS查询
        }
      });
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  }}
  disabled={isGeneratingReport}
  className="gap-2"
>
  <Download size={18} />
  {isGeneratingReport ? 'Generating...' : 'Download Report'}
</Button>
```

### 时间估计
- **报告模板设计**: 3天
- **地图截图功能**: 1天
- **PDF生成逻辑**: 2天
- **样式优化**: 1天
- **总计**: 7天

---

## 🎭 第四阶段：情景分析（优先级：低）

### 目标
实现考虑灾害级联效应的情景分析方法

### 任务清单

#### 4.1 定义灾害关联矩阵
```typescript
// src/lib/scenarioAnalysis.ts

const HAZARD_CORRELATIONS = {
  // 台风事件的级联效应
  typhoon: {
    rainstorm: 0.8,   // 台风带来暴雨的相关性
    stormSurge: 0.7,  // 台风引发风暴潮
    flood: 0.6,       // 间接导致洪水
    landslide: 0.5,   // 可能触发滑坡
  },
  // 暴雨事件的级联效应
  rainstorm: {
    flood: 0.9,       // 暴雨直接导致洪水
    landslide: 0.7,   // 暴雨触发滑坡
  },
  // 风暴潮的级联效应
  stormSurge: {
    flood: 0.6,       // 风暴潮导致沿海洪水
  },
};

// 定义4个主要情景
const SCENARIOS = [
  {
    id: 'typhoon',
    name: 'Typhoon Event',
    primary: 'typhoon',
    description: 'Strong typhoon with associated hazards'
  },
  {
    id: 'extreme_rain',
    name: 'Extreme Rainfall Event',
    primary: 'rainstorm',
    description: 'Prolonged heavy rainfall leading to flooding'
  },
  {
    id: 'coastal_flood',
    name: 'Coastal Flood Event',
    primary: 'stormSurge',
    description: 'Storm surge combined with high tide'
  },
  {
    id: 'geological',
    name: 'Geological Hazard Event',
    primary: 'landslide',
    description: 'Rainfall-triggered landslide'
  },
];
```

#### 4.2 实现情景分析算法
```typescript
function calculateScenarioScore(
  scenarioId: string,
  hazardScores: { [key: string]: number }
): ScenarioResult {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) throw new Error('Invalid scenario');
  
  const primary = scenario.primary;
  let totalScore = hazardScores[primary]; // 主要灾害得分
  
  // 添加级联效应
  if (HAZARD_CORRELATIONS[primary]) {
    Object.entries(HAZARD_CORRELATIONS[primary]).forEach(([hazard, correlation]) => {
      const cascadingEffect = hazardScores[hazard] * correlation * 0.3; // 级联权重30%
      totalScore += cascadingEffect;
    });
  }
  
  // 限制最高分为10
  totalScore = Math.min(totalScore, 10);
  
  return {
    scenarioId,
    name: scenario.name,
    score: Math.round(totalScore * 10) / 10,
    level: getRiskLevel(totalScore),
    primaryHazard: primary,
    primaryScore: hazardScores[primary]
  };
}

// 计算所有情景并找出最严重的
function analyzeAllScenarios(hazardScores: { [key: string]: number }): {
  overallScore: number,
  criticalScenario: ScenarioResult,
  allScenarios: ScenarioResult[]
} {
  const scenarios = SCENARIOS.map(s => 
    calculateScenarioScore(s.id, hazardScores)
  );
  
  const criticalScenario = scenarios.reduce((max, s) => 
    s.score > max.score ? s : max
  );
  
  return {
    overallScore: criticalScenario.score,
    criticalScenario,
    allScenarios: scenarios
  };
}
```

#### 4.3 在专业模式中添加情景分析选项
```tsx
// 在 Professional Mode 的 Risk Calculation 模块中添加

<div className="mb-4">
  <Label className="text-sm font-bold mb-2 block">Analysis Method</Label>
  <select 
    className="w-full border border-gray-300 rounded px-3 py-2"
    value={analysisMethod}
    onChange={(e) => setAnalysisMethod(e.target.value)}
  >
    <option value="weighted">Weighted Average (Simple)</option>
    <option value="scenario">Scenario Analysis (Recommended)</option>
  </select>
  <p className="text-xs text-gray-600 mt-1">
    {analysisMethod === 'weighted' 
      ? 'Treats all hazards as independent. Fast but may not reflect real-world correlations.' 
      : 'Considers hazard correlations and cascading effects. More accurate for event-based risk.'}
  </p>
</div>

{analysisMethod === 'scenario' && riskConfig.scenarios.length > 0 && (
  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
    <p className="text-sm font-bold mb-2">Scenario Analysis Results:</p>
    <div className="space-y-2">
      {riskConfig.scenarios.map(scenario => (
        <div key={scenario.scenarioId} className="flex items-center justify-between">
          <span className="text-xs">{scenario.name}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${(scenario.score / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold w-8">{scenario.score}</span>
          </div>
        </div>
      ))}
    </div>
    <p className="text-xs text-amber-700 mt-3 font-semibold">
      🎯 Critical Scenario: {riskConfig.criticalScenario?.name} (Score: {riskConfig.criticalScenario?.score})
    </p>
  </div>
)}
```

### 时间估计
- **关联矩阵设计**: 1天
- **情景分析算法**: 2天
- **UI集成**: 1天
- **测试验证**: 1天
- **总计**: 5天

---

## 📊 总时间估计与里程碑

| 阶段 | 任务 | 工作量 | 优先级 |
|-----|------|--------|--------|
| 阶段1 | 评分系统重构 | 4-6天 | 🔴 高 |
| 阶段2 | WMS数据集成 | 6天 | 🔴 高 |
| 阶段3 | PDF报告生成 | 7天 | 🟡 中 |
| 阶段4 | 情景分析 | 5天 | 🟢 低 |
| **总计** | **全部功能** | **22-24天** | - |

### 推荐的实施顺序
1. **第1周**: 完成阶段1（评分系统），使系统符合行业标准
2. **第2周**: 完成阶段2（WMS集成），实现真实数据查询
3. **第3周**: 完成阶段3（PDF报告），达到商用标准
4. **第4周**: 完成阶段4（情景分析），提供高级功能

### 最小可行产品 (MVP)
如果时间有限，建议先完成：
- ✅ 阶段1: 评分系统重构（必需）
- ✅ 阶段2: WMS数据集成（必需）
- ⏭️ 阶段3: PDF报告生成（可后续添加）
- ⏭️ 阶段4: 情景分析（可后续添加）

**MVP 时间**: 10-12天

---

## 🎯 成功标准

### 功能完整性
- [ ] 5个灾种均实现0-10评分
- [ ] 所有重现期图层均可查询
- [ ] Overall Score 综合所有灾种
- [ ] PDF报告包含所有必要信息
- [ ] 情景分析考虑级联效应

### 数据准确性
- [ ] WMS查询返回正确数值
- [ ] 评分逻辑符合行业标准
- [ ] 关联矩阵基于科学研究

### 用户体验
- [ ] 查询响应时间 < 3秒
- [ ] 地址输入支持模糊匹配
- [ ] PDF生成时间 < 10秒
- [ ] 错误处理完善（无数据时的提示）

### 专业性
- [ ] 报告格式符合再保险行业标准
- [ ] 术语使用专业规范
- [ ] 数据来源和方法论透明

---

## 下一步行动

**立即开始**:
1. 创建 `src/lib/riskScoring.ts` 文件
2. 实现 0-10 评分函数
3. 更新查询结果显示UI

**本周目标**:
- 完成评分系统重构
- 开始WMS查询集成

**需要的支持**:
- GeoServer图层数据准备
- Mapbox API密钥（用于卫星影像）
- 历史灾害数据（用于验证评分）
