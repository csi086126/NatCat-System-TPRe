/**
 * Geospatial Data Hub - WMS 图层样式配置
 * 
 * 这个文件定义了所有 WMS 图层的视觉样式参数
 * 包括透明度、颜色方案（SLD）、混合模式等
 */

export interface LayerStyleConfig {
  opacity: number;
  styles?: string; // SLD 样式名称
  cqlFilter?: string; // CQL 过滤器
  env?: string; // 环境变量（用于动态着色）
}

/**
 * 图层样式配置
 */
export const layerStyles: Record<string, LayerStyleConfig> = {
  // 建筑物图层 - 使用柔和的蓝灰色
  building: {
    opacity: 0.7,
    styles: '', // 留空使用默认样式，或指定 GeoServer 中的 SLD 样式名
    // 如果要自定义颜色，可以添加 env 参数
    env: 'color:#4A90E2;outline:#2E5C8A', // 蓝色建筑，深蓝色边框
  },

  // 边界图层 - 明显的红色边界
  boundary: {
    opacity: 0.8,
    env: 'color:#E74C3C;width:2', // 红色边界，2像素宽
  },

  // 年降雨量 - 蓝色到深蓝色渐变
  annualRainfall: {
    opacity: 0.6,
    // 可以在 GeoServer 中创建一个蓝色渐变的 SLD 样式
    styles: '', 
  },

  // 排水系统图层组 - 统一的青色系
  drainageConduits: {
    opacity: 0.75,
    env: 'color:#00BCD4;width:3', // 青色管道，3像素宽
  },

  drainageJunctions: {
    opacity: 0.8,
    env: 'color:#00ACC1;size:6', // 深青色节点，6像素大小
  },

  drainageOutfalls: {
    opacity: 0.85,
    env: 'color:#FF6F00;size:8', // 橙色出水口，8像素大小（醒目）
  },

  // 人口密度 - 暖色调热力图
  populationDensity: {
    opacity: 0.65,
    // 建议在 GeoServer 中配置黄-橙-红渐变
    styles: '', 
  },

  // 土地覆盖 - 自然色调
  landCover: {
    opacity: 0.6,
    // 绿色（森林）、黄色（农田）、灰色（城市）等
  },

  // 水库 - 深蓝色
  serviceReservoirs: {
    opacity: 0.8,
    env: 'color:#1976D2;outline:#0D47A1', // 蓝色水体，深蓝边框
  },
};

/**
 * 预设的配色方案
 */
export const colorSchemes = {
  // 方案1：专业蓝色系（适合水利、城市规划）
  professional: {
    primary: '#2196F3',      // 主蓝色
    secondary: '#00BCD4',    // 青色
    accent: '#FF9800',       // 橙色强调
    danger: '#F44336',       // 红色警告
    success: '#4CAF50',      // 绿色
  },

  // 方案2：柔和自然系（适合环境分析）
  natural: {
    primary: '#66BB6A',      // 绿色
    secondary: '#42A5F5',    // 天蓝色
    accent: '#FFCA28',       // 金黄色
    danger: '#EF5350',       // 浅红色
    success: '#26A69A',      // 青绿色
  },

  // 方案3：高对比度（适合演示展示）
  highContrast: {
    primary: '#3F51B5',      // 靛蓝色
    secondary: '#E91E63',    // 粉红色
    accent: '#FFC107',       // 琥珀色
    danger: '#F44336',       // 红色
    success: '#8BC34A',      // 浅绿色
  },

  // 方案4：夜间模式（深色底图适用）
  dark: {
    primary: '#64B5F6',      // 亮蓝色
    secondary: '#81C784',    // 亮绿色
    accent: '#FFD54F',       // 亮黄色
    danger: '#E57373',       // 亮红色
    success: '#4DB6AC',      // 亮青色
  },
};

/**
 * 根据配色方案生成图层样式
 */
export function getLayerStyleWithScheme(
  layerKey: string, 
  scheme: keyof typeof colorSchemes = 'professional'
): LayerStyleConfig {
  const baseStyle = layerStyles[layerKey] || { opacity: 0.7 };
  const colors = colorSchemes[scheme];
  
  // 根据图层类型应用配色方案
  const colorMapping: Record<string, string> = {
    building: colors.primary,
    boundary: colors.danger,
    annualRainfall: colors.secondary,
    drainageConduits: colors.secondary,
    drainageJunctions: colors.accent,
    drainageOutfalls: colors.accent,
    populationDensity: colors.danger,
    landCover: colors.success,
    serviceReservoirs: colors.primary,
  };

  return {
    ...baseStyle,
    env: `color:${colorMapping[layerKey] || colors.primary}`,
  };
}

/**
 * 混合模式选项（用于图层叠加效果）
 */
export const blendModes = {
  normal: 'normal',           // 正常
  multiply: 'multiply',       // 正片叠底（加深效果）
  screen: 'screen',           // 滤色（变亮效果）
  overlay: 'overlay',         // 叠加（增强对比）
  darken: 'darken',           // 变暗
  lighten: 'lighten',         // 变亮
  colorDodge: 'color-dodge',  // 颜色减淡
  colorBurn: 'color-burn',    // 颜色加深
};
