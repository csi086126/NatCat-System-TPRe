/**
 * GeoServer URL 配置 — WMS / 通用 WMS / WCS 三个 URL。
 *
 * - GEOSERVER_WMS_URL:           用于 Leaflet WMSTileLayer
 * - GEOSERVER_GEOSPATIAL_URL:    WMS URL(可独立配置走单独的 WMS endpoint,如生产/演示分离)
 * - GEOSERVER_WCS_URL:           WCS endpoint,用于读取 raster 单像素值
 *                                (DEM 高程采样)。从 GEOSPATIAL_URL 推导
 *                                (末段 /wms → /wcs)。
 *
 * 为什么需要 WCS:GeoServer 2.22 的 WMS GetFeatureInfo 服务端 bug —
 * 在所有 info_format (text/plain / application/json / text/html / gml) 下
 * 都会抛 `Null charset name`。WCS GetCoverage 返回 1×1 GeoTIFF,
 * 浏览器端用 geotiff.js 解码即可读到真实栅格值,且能自动 reproject nativeCRS
 * (HK_DEM_5m native 是 EPSG:2326,MO_DEM_TIF_clipped native 是 WGS84,
 * 都用 EPSG:4326 bbox 即可)。
 */

const NEXT_PUBLIC_GEOSERVER_WMS_URL = process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL;
if (!NEXT_PUBLIC_GEOSERVER_WMS_URL) {
  throw new Error(
    '未配置 NEXT_PUBLIC_GEOSERVER_WMS_URL。请在 .env 中设置后重启服务。'
  );
}

export const GEOSERVER_WMS_URL: string = NEXT_PUBLIC_GEOSERVER_WMS_URL;

const NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL: string =
  process.env.NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL || GEOSERVER_WMS_URL;

export const GEOSERVER_GEOSPATIAL_URL: string = NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL;

// 澳门 LULC (CDROM_C 数据) 单独走一个 endpoint
// 默认回退到 WMS_URL,生产应配置到持有 natcat_platform workspace 的内网 GeoServer
const NEXT_PUBLIC_GEOSERVER_LULC_URL: string =
  process.env.NEXT_PUBLIC_GEOSERVER_LULC_URL || GEOSERVER_WMS_URL;

export const GEOSERVER_LULC_URL: string = NEXT_PUBLIC_GEOSERVER_LULC_URL;

// WCS base URL — 优先用独立 env 变量,否则从 GEOSPATIAL_URL 推导。
// 推导规则:末段 /wms 替换为 /wcs (例 http://h:8080/geoserver/wms → /wcs)。
const NEXT_PUBLIC_GEOSERVER_WCS_URL: string =
  process.env.NEXT_PUBLIC_GEOSERVER_WCS_URL ||
  NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL.replace(/\/wms\/?$/, '/wcs');

export const GEOSERVER_WCS_URL: string = NEXT_PUBLIC_GEOSERVER_WCS_URL;