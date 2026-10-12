// 验证 gcj02ToWgs84 在不同地区的校正行为
// 模拟 Amap 返回的火星坐标(已知 WGS-84 + 实际偏移量)
// 测试地点:澳门/香港/曼谷/河内/吉隆坡/东京(境外)

// 把页面里的转换函数复制到这里(纯逻辑,可独立测试)
const outOfChina = (lat, lng) =>
  lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;

function wgs84ToGcj02(latitude, longitude) {
  if (outOfChina(latitude, longitude)) return [latitude, longitude];
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const transformLat = (x, y) => {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y;
    ret += 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  };
  const transformLng = (x, y) => {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y;
    ret += 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  };
  let dLat = transformLat(longitude - 105.0, latitude - 35.0);
  let dLng = transformLng(longitude - 105.0, latitude - 35.0);
  const radLat = (latitude / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 + ee * (magic - Math.sin(radLat));
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [latitude + dLat, longitude + dLng];
}

function gcj02ToWgs84(latitude, longitude) {
  if (outOfChina(latitude, longitude)) return [latitude, longitude];
  let wgsLat = latitude;
  let wgsLng = longitude;
  for (let i = 0; i < 5; i++) {
    const [predGcjLat, predGcjLng] = wgs84ToGcj02(wgsLat, wgsLng);
    const dLat = latitude - predGcjLat;
    const dLng = longitude - predGcjLng;
    if (Math.abs(dLat) < 1e-7 && Math.abs(dLng) < 1e-7) break;
    wgsLat += dLat;
    wgsLng += dLng;
  }
  return [wgsLat, wgsLng];
}

// 各地已知 WGS-84 真值(来自 Google Maps / GPS)
const places = [
  { name: '澳门 大三巴',     wgs: [22.1979, 113.5417] },
  { name: '香港 中环 IFC',   wgs: [22.2855, 114.1585] },
  { name: '深圳 平安金融中心', wgs: [22.5410, 114.0596] },
  { name: '广州 珠江新城',   wgs: [23.1196, 113.3245] },
  { name: '曼谷 大皇宫',     wgs: [13.7500, 100.4913] },
  { name: '河内 还剑湖',     wgs: [21.0285, 105.8542] },
  { name: '吉隆坡 双子塔',   wgs: [3.1578, 101.7117] },
  { name: '新加坡 滨海湾',   wgs: [1.2839, 103.8607] }, // 纬度 < 0.8293 应跳过
  { name: '东京 涩谷',       wgs: [35.6595, 139.7005] }, // 经度 > 137.83 应跳过
  { name: '首尔 明洞',       wgs: [37.5636, 126.9869] }, // 应转换
];

console.log('place                  | WGS-84 真值         | outOfChina | 会做校正 | GCJ-02 (Amap 返回) | 转回 WGS-84');
console.log('-'.repeat(160));
for (const p of places) {
  const ooc = outOfChina(p.wgs[0], p.wgs[1]);
  const skip = ooc ? '否' : '是';
  const gcj = wgs84ToGcj02(p.wgs[0], p.wgs[1]);
  const back = gcj02ToWgs84(gcj[0], gcj[1]);
  const dLat = Math.abs(back[0] - p.wgs[0]);
  const dLng = Math.abs(back[1] - p.wgs[1]);
  console.log(
    `${p.name.padEnd(22)} | ${p.wgs[0].toFixed(4)}, ${p.wgs[1].toFixed(4)}    | ` +
    `${String(ooc).padEnd(10)}  |   ${skip}    | ${gcj[0].toFixed(4)}, ${gcj[1].toFixed(4)}   | ` +
    `${back[0].toFixed(4)}, ${back[1].toFixed(4)} (dLat=${dLat.toExponential(2)}, dLng=${dLng.toExponential(2)})`
  );
}