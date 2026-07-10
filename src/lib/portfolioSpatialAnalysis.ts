/**
 * Client-side Portfolio Statistics Calculator
 * 纯前端计算 - 通过GeoJSON多边形与保单点进行空间匹配
 * 无需数据库配置，立即可用！
 */

import turf from '@turf/turf';

export interface PolicyPoint {
  latitude: number;
  longitude: number;
  exposure: number;
  policy_id: string;
  business_type?: string;
}

export interface RegionStats {
  region_type: string;
  region_id: string | number;
  policy_count: number;
  total_exposure: number;
  avg_exposure: number;
  min_exposure: number;
  max_exposure: number;
  business_type_count: number;
}

/**
 * 从API获取保单数据
 */
export async function fetchPolicies(): Promise<PolicyPoint[]> {
  try {
    const response = await fetch('/api/portfolio/all-policies');
    const data = await response.json();

    if (data.success) {
      return data.data.map((p: any) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        exposure: p.sum_insured || p.公司保額 || 0,
        policy_id: p.policy_id || p.保單號,
        business_type: p.business_type || p.業務類別,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch policies:', error);
    return [];
  }
}

/**
 * 计算指定区域内的保单统计
 * @param polygon GeoJSON多边形特征
 * @param policies 所有保单点数据
 */
export function calculateRegionStats(
  polygon: any,
  policies: PolicyPoint[]
): RegionStats {
  // 筛选出在多边形内的保单
  const policiesInRegion = policies.filter(policy => {
    const point = turf.point([policy.longitude, policy.latitude]);
    return turf.booleanPointInPolygon(point, polygon);
  });

  // 如果没有保单
  if (policiesInRegion.length === 0) {
    return {
      region_type: polygon.properties.TPU ? 'TPU' :
                   polygon.properties.PPU ? 'PPU' :
                   polygon.properties.SPU ? 'SPU' : 'UNKNOWN',
      region_id: polygon.properties.TPU ||
                 polygon.properties.PPU ||
                 polygon.properties.SPU ||
                 polygon.properties.DISTRICT || 'N/A',
      policy_count: 0,
      total_exposure: 0,
      avg_exposure: 0,
      min_exposure: 0,
      max_exposure: 0,
      business_type_count: 0,
    };
  }

  // 计算统计数据
  const exposures = policiesInRegion.map(p => p.exposure);
  const total_exposure = exposures.reduce((sum, exp) => sum + exp, 0);
  const avg_exposure = total_exposure / policiesInRegion.length;
  const min_exposure = Math.min(...exposures);
  const max_exposure = Math.max(...exposures);

  // 计算业务类型数量
  const businessTypes = new Set(
    policiesInRegion
      .map(p => p.business_type)
      .filter(bt => bt !== undefined && bt !== null)
  );

  return {
    region_type: polygon.properties.TPU ? 'TPU' :
                 polygon.properties.PPU ? 'PPU' :
                 polygon.properties.SPU ? 'SPU' :
                 polygon.properties.DISTRICT ? 'DISTRICT' : 'UNKNOWN',
    region_id: polygon.properties.TPU ||
               polygon.properties.PPU ||
               polygon.properties.SPU ||
               polygon.properties.DISTRICT || 'N/A',
    policy_count: policiesInRegion.length,
    total_exposure,
    avg_exposure,
    min_exposure,
    max_exposure,
    business_type_count: businessTypes.size,
  };
}

/**
 * 缓存保单数据以提高性能
 */
let cachedPolicies: PolicyPoint[] | null = null;

export async function getCachedPolicies(): Promise<PolicyPoint[]> {
  if (!cachedPolicies) {
    cachedPolicies = await fetchPolicies();
    console.log(`✅ Loaded ${cachedPolicies.length} policies for spatial analysis`);
  }
  return cachedPolicies;
}

/**
 * 清除缓存（例如在数据更新后）
 */
export function clearPoliciesCache() {
  cachedPolicies = null;
}
