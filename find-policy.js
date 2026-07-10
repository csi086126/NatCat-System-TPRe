const fs = require('fs');

const policyToFind = '060101152022009885';

console.log('Searching for policy:', policyToFind);
console.log('='.repeat(60));

// Load full dataset
console.log('\n1. Checking full geocoded dataset...');
try {
  const rawData = fs.readFileSync('public/data/tphk-geocoded-portfolio.json', 'utf8');
  const data = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));

  const found = data.find(item => {
    const policyId = item['保單號'] || item['policy_id'] || '';
    return policyId.includes(policyToFind);
  });

  if (found) {
    console.log('✓ FOUND in full dataset!');
    console.log('  Policy ID:', found['保單號'] || found['policy_id']);
    console.log('  Address:', found['保險處所'] || found['address']);
    console.log('  Region:', found['分區'] || found['region']);
    console.log('  Year:', (found['保單起期'] || found['policy_start'] || '').substring(0, 4));
    console.log('  Has location:', !!found.location);
    if (found.location) {
      console.log('  Coordinates:', found.location.lat, ',', found.location.lng);
      console.log('  Sum Insured:', found['公司保額'] || found['sum_insured']);
    } else {
      console.log('  ❌ NO LOCATION DATA - This is why it won\'t show on map!');
    }
  } else {
    console.log('✗ NOT FOUND in full dataset');
  }
} catch (error) {
  console.log('Error loading full dataset:', error.message);
}

// Check year-specific files
console.log('\n2. Checking year-specific files...');
const years = ['2021', '2022', '2023', '2024'];

for (const year of years) {
  try {
    const filePath = `public/data/by-year/tphk-portfolio-${year}.json`;
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));

    const found = data.find(item => {
      const policyId = item['保單號'] || item['policy_id'] || '';
      return policyId.includes(policyToFind);
    });

    if (found) {
      console.log(`  ✓ Found in ${year} file!`);
      console.log('    Has location:', !!found.location);
      if (found.location) {
        console.log('    Lat/Lng:', found.location.lat, ',', found.location.lng);
      } else {
        console.log('    ❌ NO LOCATION - Won\'t appear on map');
      }
    }
  } catch (error) {
    // File might not exist
  }
}

// Check subset file
console.log('\n3. Checking subset file...');
try {
  const rawData = fs.readFileSync('public/data/tphk_portfolio_subset_5000.json', 'utf8');
  const data = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));

  const found = data.find(item => {
    const policyId = item['保單號'] || item['policy_id'] || item.id || '';
    return policyId.toString().includes(policyToFind);
  });

  if (found) {
    console.log('  ✓ Found in subset file!');
  } else {
    console.log('  ✗ Not in subset file (only 5000 records)');
  }
} catch (error) {
  console.log('Error loading subset:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('Search complete!');
