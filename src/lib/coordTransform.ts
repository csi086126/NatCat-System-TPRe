/**
 * 坐标转换工具
 * 
 * 百度坐标（BD-09）、国测局坐标（火星坐标，GCJ-02）、和 WGS84 坐标系之间的转换
 * 
 * 参考: https://github.com/wandergis/coordtransform
 * 
 * WGS84: GPS 标准坐标系，Google Earth、GPS设备使用
 * GCJ-02: 中国国测局坐标系（火星坐标），高德地图、腾讯地图使用
 * BD-09: 百度坐标系，百度地图使用
 */

const x_pi = 3.14159265358979324 * 3000.0 / 180.0;
const pi = 3.1415926535897932384626;
const a = 6378245.0;  // 长半轴
const ee = 0.00669342162296594323;  // 扁率

/**
 * 判断是否在中国境内（不在境内不做偏移）
 */
function outOfChina(lng, lat) {
  if (lng < 72.004 || lng > 137.8347) {
    return true;
  }
  if (lat < 0.8293 || lat > 55.8271) {
    return true;
  }
  return false;
}

/**
 * 纬度转换
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * pi) + 40.0 * Math.sin(lat / 3.0 * pi)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * pi) + 320 * Math.sin(lat * pi / 30.0)) * 2.0 / 3.0;
  return ret;
}

/**
 * 经度转换
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * pi) + 40.0 * Math.sin(lng / 3.0 * pi)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * pi) + 300.0 * Math.sin(lng / 30.0 * pi)) * 2.0 / 3.0;
  return ret;
}

/**
 * WGS84 转 GCJ-02（火星坐标系）
 * 
 * @param lng WGS84 经度
 * @param lat WGS84 纬度
 * @returns [lng, lat] GCJ-02 坐标
 */
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * pi;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
  const mglat = lat + dlat;
  const mglng = lng + dlng;
  return [mglng, mglat];
}

/**
 * GCJ-02（火星坐标系）转 WGS84
 * 
 * @param lng GCJ-02 经度
 * @param lat GCJ-02 纬度
 * @returns [lng, lat] WGS84 坐标
 */
function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * pi;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
  const mglat = lat + dlat;
  const mglng = lng + dlng;
  return [lng * 2 - mglng, lat * 2 - mglat];
}

/**
 * GCJ-02（火星坐标系）转 BD-09（百度坐标系）
 * 
 * @param lng GCJ-02 经度
 * @param lat GCJ-02 纬度
 * @returns [lng, lat] BD-09 坐标
 */
function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
  const bd_lng = z * Math.cos(theta) + 0.0065;
  const bd_lat = z * Math.sin(theta) + 0.006;
  return [bd_lng, bd_lat];
}

/**
 * BD-09（百度坐标系）转 GCJ-02（火星坐标系）
 * 
 * @param lng BD-09 经度
 * @param lat BD-09 纬度
 * @returns [lng, lat] GCJ-02 坐标
 */
function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
  const gg_lng = z * Math.cos(theta);
  const gg_lat = z * Math.sin(theta);
  return [gg_lng, gg_lat];
}

/**
 * WGS84 转 BD-09（百度坐标系）
 * 
 * @param lng WGS84 经度
 * @param lat WGS84 纬度
 * @returns [lng, lat] BD-09 坐标
 */
function wgs84ToBd09(lng, lat) {
  const gcj = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcj[0], gcj[1]);
}

/**
 * BD-09（百度坐标系）转 WGS84
 * 
 * @param lng BD-09 经度
 * @param lat BD-09 纬度
 * @returns [lng, lat] WGS84 坐标
 */
function bd09ToWgs84(lng, lat) {
  const gcj = bd09ToGcj02(lng, lat);
  return gcj02ToWgs84(gcj[0], gcj[1]);
}

// ES Module exports
module.exports = {
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  outOfChina,
};

// Also export as default for ESM
if (typeof exports !== 'undefined') {
  exports.default = {
    wgs84ToGcj02,
    gcj02ToWgs84,
    gcj02ToBd09,
    bd09ToGcj02,
    wgs84ToBd09,
    bd09ToWgs84,
    outOfChina,
  };
}
