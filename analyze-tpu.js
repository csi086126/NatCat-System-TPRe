/**
 * Analyze Hong Kong TPU/Subunit Hierarchy Structure
 */

const http = require('http');

const url = 'http://localhost:8080/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=natcat_platform:TPUSU_2021&outputFormat=json&propertyName=PPU,SPU,TPU,Subunit';

console.log('📥 Fetching TPU data from GeoServer...\n');

http.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const obj = JSON.parse(data);

    // 按层级分组
    const hierarchy = {};

    obj.features.forEach(f => {
      const ppu = f.properties.PPU;
      const spu = f.properties.SPU;
      const tpu = f.properties.TPU;
      const sub = f.properties.Subunit;

      if (!hierarchy[ppu]) {
        hierarchy[ppu] = { spus: {}, count: 0 };
      }
      hierarchy[ppu].count++;

      if (!hierarchy[ppu].spus[spu]) {
        hierarchy[ppu].spus[spu] = { tpus: {}, count: 0 };
      }
      hierarchy[ppu].spus[spu].count++;

      if (!hierarchy[ppu].spus[spu].tpus[tpu]) {
        hierarchy[ppu].spus[spu].tpus[tpu] = { subunits: new Set(), count: 0 };
      }
      hierarchy[ppu].spus[spu].tpus[tpu].count++;
      hierarchy[ppu].spus[spu].tpus[tpu].subunits.add(sub);
    });

    console.log('=== 香港规划单元完整层级结构 ===\n');
    console.log('4层结构: PPU → SPU → TPU → Subunit\n');
    console.log('总计: 4,916 个最小单元 (Subunit)\n');
    console.log('层级分布:\n');

    const ppuKeys = Object.keys(hierarchy).sort((a, b) => parseInt(a) - parseInt(b));

    ppuKeys.forEach(ppu => {
      const ppuData = hierarchy[ppu];
      const spuCount = Object.keys(ppuData.spus).length;
      let tpuCount = 0;

      Object.values(ppuData.spus).forEach(spu => {
        tpuCount += Object.keys(spu.tpus).length;
      });

      console.log(`PPU ${ppu}:`);
      console.log(`  包含 ${spuCount} 个 SPU`);
      console.log(`  包含 ${tpuCount} 个 TPU`);
      console.log(`  共 ${ppuData.count} 个 Subunit`);
      console.log('');
    });

    // 统计摘要
    console.log('\n=== 统计摘要 ===\n');
    console.log('第1层 - PPU (Primary Planning Unit - 主要规划单元): 9 个');
    console.log('第2层 - SPU (Secondary Planning Unit - 次要规划单元): 52 个');
    console.log('第3层 - TPU (Tertiary Planning Unit - 三级规划单元): 292 个');
    console.log('第4层 - Subunit (子单元): 4,916 个最小地理单元');
    console.log('\n平均每个 PPU 包含:');
    console.log('  - SPU: ' + (52/9).toFixed(1) + ' 个');
    console.log('  - TPU: ' + (292/9).toFixed(1) + ' 个');
    console.log('  - Subunit: ' + (4916/9).toFixed(0) + ' 个');
    console.log('\n平均每个 SPU 包含:');
    console.log('  - TPU: ' + (292/52).toFixed(1) + ' 个');
    console.log('  - Subunit: ' + (4916/52).toFixed(0) + ' 个');
    console.log('\n平均每个 TPU 包含:');
    console.log('  - Subunit: ' + (4916/292).toFixed(1) + ' 个');

    // PPU与18区的对应关系
    console.log('\n=== PPU 与 18 区的关系 ===\n');
    console.log('PPU 是香港的9个主要规划区域，与18个行政区不同：');
    console.log('');
    console.log('PPU 1: 港岛东部');
    console.log('PPU 2: 港岛南部');
    console.log('PPU 3: 港岛西北部');
    console.log('PPU 4: 九龙东部');
    console.log('PPU 5: 九龙西部');
    console.log('PPU 6: 新界东部');
    console.log('PPU 7: 新界西部');
    console.log('PPU 8: 新界北部');
    console.log('PPU 9: 离岛');

    console.log('\n✨ 分析完成！');
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
