const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

// Find Wan Chai policies with successful geocoding
const wanChaiPolicies = data.filter(p => {
  const district = p['分区'] || p.region;
  const hasGoodGeocode = p.location && p.location.formatted_address !== 'Hong Kong';
  return district === '灣仔區' && hasGoodGeocode;
});

console.log('=== 灣仔區的正确TPU分布 ===');
console.log('(基于成功地理编码的保单)');
console.log('');
console.log('成功地理编码的灣仔區保单数:', wanChaiPolicies.length);
console.log('');

// Count by TPU
const tpuCount = {};
wanChaiPolicies.forEach(p => {
  const tpu = p.TPU;
  if (!tpuCount[tpu]) {
    tpuCount[tpu] = {
      count: 0,
      totalExposure: 0,
      sampleAddresses: []
    };
  }
  tpuCount[tpu].count++;
  tpuCount[tpu].totalExposure += p.sum_insured || 0;
  if (tpuCount[tpu].sampleAddresses.length < 3) {
    tpuCount[tpu].sampleAddresses.push({
      address: p.address.substring(0, 60),
      coords: [p.location.lat, p.location.lng]
    });
  }
});

console.log('TPU分布:');
Object.entries(tpuCount)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([tpu, data]) => {
    console.log(`\nTPU ${tpu}: ${data.count} 个保单, HKD ${data.totalExposure.toLocaleString()}`);
    console.log('  样本地址:');
    data.sampleAddresses.forEach(s => {
      console.log(`    - ${s.address}... (${s.coords[0].toFixed(4)}, ${s.coords[1].toFixed(4)})`);
    });
  });

// Now check where HKCEC coordinates would fall
console.log('\n=== 香港会展中心应该在哪个TPU? ===');
console.log('会展中心正确坐标: 22.2828, 114.1746');
console.log('');

// Find policies near HKCEC coordinates
const nearHKCEC = wanChaiPolicies.filter(p => {
  const lat = p.location.lat;
  const lng = p.location.lng;
  // Within ~0.01 degrees (~1km)
  return Math.abs(lat - 22.2828) < 0.01 && Math.abs(lng - 114.1746) < 0.01;
});

if (nearHKCEC.length > 0) {
  console.log(`找到 ${nearHKCEC.length} 个靠近会展中心的保单:`);
  nearHKCEC.slice(0, 5).forEach(p => {
    console.log(`  TPU ${p.TPU}: ${p.address.substring(0, 60)}...`);
    console.log(`    坐标: ${p.location.lat.toFixed(6)}, ${p.location.lng.toFixed(6)}`);
  });
} else {
  console.log('没有找到靠近会展中心坐标的保单');
  console.log('会展中心可能属于以下TPU之一:');
  Object.entries(tpuCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .forEach(([tpu, data]) => {
      console.log(`  - TPU ${tpu} (${data.count} 个灣仔區保单)`);
    });
}
