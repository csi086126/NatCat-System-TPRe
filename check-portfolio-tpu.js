const fs = require('fs');

// Try different portfolio files (start with smaller ones)
const portfolioPaths = [
  'd:/Nat Cat Platform/UI_system/public/data/tphk_portfolio_subset_5000.json',
  'd:/Nat Cat Platform/UI_system/public/data/tphk-geocoded-portfolio.json',
  'd:/Nat Cat Platform/UI_system/public/data/tphk-portfolio-oed-complete.json',
  'd:/Nat Cat Platform/UI_system/public/data/tphk-portfolio-oed-geocoded-final.json'
];

let portfolio = null;
let portfolioPath = null;

for (const path of portfolioPaths) {
  if (fs.existsSync(path)) {
    console.log('Found portfolio file:', path);
    portfolioPath = path;
    portfolio = JSON.parse(fs.readFileSync(path, 'utf8'));
    break;
  }
}

if (!portfolio) {
  console.log('No portfolio file found');
  process.exit(1);
}

console.log('Total policies:', portfolio.length);

// Check for the missing TPUs
const missingTPUs = [414, 620, 733, 743, 934];

console.log('\n=== Checking policies for missing TPUs ===');
missingTPUs.forEach(tpuId => {
  const policiesInTPU = portfolio.filter(p => p.tpu == tpuId || p.TPU == tpuId);
  console.log(`\nTPU ${tpuId}:`);
  console.log(`  Direct policies: ${policiesInTPU.length}`);

  if (policiesInTPU.length > 0) {
    const totalExposure = policiesInTPU.reduce((sum, p) => sum + (p.sum_insured || p['公司保額'] || 0), 0);
    console.log(`  Total exposure: ${totalExposure.toLocaleString()}`);
    console.log(`  Sample policy:`, {
      tpu: policiesInTPU[0].tpu || policiesInTPU[0].TPU,
      spu: policiesInTPU[0].spu || policiesInTPU[0].SPU,
      subunit: policiesInTPU[0].subunit || policiesInTPU[0].SUBUNIT,
      exposure: policiesInTPU[0].sum_insured || policiesInTPU[0]['公司保額']
    });
  }

  // Check for policies in subunits that belong to this TPU
  const policiesInSubunits = portfolio.filter(p => {
    const subunit = p.subunit || p.SUBUNIT;
    if (!subunit) return false;
    // Subunit format is like 4141, 7431, etc. (TPU + subunit number)
    return String(subunit).startsWith(String(tpuId));
  });

  console.log(`  Policies in subunits: ${policiesInSubunits.length}`);
  if (policiesInSubunits.length > 0) {
    const totalExposure = policiesInSubunits.reduce((sum, p) => sum + (p.sum_insured || p['公司保額'] || 0), 0);
    console.log(`  Total subunit exposure: ${totalExposure.toLocaleString()}`);
    const uniqueSubunits = [...new Set(policiesInSubunits.map(p => p.subunit || p.SUBUNIT))];
    console.log(`  Unique subunits: ${uniqueSubunits.sort()}`);
  }
});

// Check SPU 34
console.log('\n=== Checking policies for missing SPU 34 ===');
const policiesInSPU34 = portfolio.filter(p => p.spu == 34 || p.SPU == 34);
console.log(`SPU 34: ${policiesInSPU34.length} policies`);
if (policiesInSPU34.length > 0) {
  const totalExposure = policiesInSPU34.reduce((sum, p) => sum + (p.sum_insured || p['公司保額'] || 0), 0);
  console.log(`  Total exposure: ${totalExposure.toLocaleString()}`);
}
