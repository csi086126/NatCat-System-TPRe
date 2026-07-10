const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'portfolio', 'PortfolioMap.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Update interface
content = content.replace(
  /interface PortfolioMapProps \{\s*selectedYear: number \| null;\s*\}/,
  `interface PortfolioMapProps {
  selectedYear: number | null;
  region: string;
}`
);

// Step 2: Update function signature
content = content.replace(
  /export default function PortfolioMap\(\{ selectedYear \}: PortfolioMapProps\)/,
  'export default function PortfolioMap({ selectedYear, region }: PortfolioMapProps)'
);

// Step 3: Update defaultCenter
content = content.replace(
  /const defaultCenter: \[number, number\] = \[22\.3193, 114\.1694\];/,
  `const defaultCenter: [number, number] = region === 'mo' ? [22.1987, 113.5439] : [22.3193, 114.1694];`
);

// Step 4: Update useEffect dependency array
content = content.replace(
  /\}, \[mounted, selectedYear, sampleSize\]\);/,
  '}, [mounted, selectedYear, sampleSize, region]);'
);

// Step 5: Add region-based data loading logic right after "let allData = [];"
const dataLoadingCode = `
        // Determine data paths based on region
        const dataPath = region === 'mo' ? '/data/macau' : '/data/by-year';
        const prefix = region === 'mo' ? 'tpmo-portfolio-enhanced' : 'tphk-portfolio';
        const fileExt = region === 'mo' ? '.geojson' : '.json';
`;

content = content.replace(
  /let allData = \[\];/,
  `let allData = [];
${dataLoadingCode}`
);

// Step 6: Update the fetch URL for year-specific files
content = content.replace(
  /const response = await fetch\(`\/data\/by-year\/tphk-portfolio-\$\{selectedYear\}\.json`\);/,
  `const filePath = region === 'mo'
              ? \`\${dataPath}/\${prefix}-\${selectedYear}\${fileExt}\`
              : \`\${dataPath}/\${prefix}-\${selectedYear}\${fileExt}\`;
            const response = await fetch(filePath);`
);

// Step 7: Update the fetch URL for all years (subset file)
content = content.replace(
  /const response = await fetch\('\/data\/tphk_portfolio_subset_5000\.json'\);/,
  `const subsetFile = region === 'mo'
              ? '/data/macau/tpmo-portfolio-enhanced.geojson'
              : '/data/tphk_portfolio_subset_5000.json';
            const response = await fetch(subsetFile);`
);

// Step 8: Handle GeoJSON format for Macau (after the fetch)
const geojsonHandling = `
        // Handle GeoJSON format for Macau
        if (region === 'mo' && allData.type === 'FeatureCollection') {
          allData = allData.features.map((feature: any) => ({
            ...feature.properties,
            location: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            }
          }));
        }
`;

content = content.replace(
  /\/\/ Extract location data\s+const allLocs: LocationData\[\]/,
  `${geojsonHandling.trim()}

        // Extract location data
        const allLocs: LocationData[]`
);

// Step 9: Update field mappings to support both HK and MO field names
content = content.replace(
  /sum_insured: item\.公司保額 \|\| item\.sum_insured \|\| 0,/,
  `sum_insured: item.公司保額 || item.company_sum_insured || item.sum_insured || 0,`
);

content = content.replace(
  /address: item\.保險處所 \|\| item\.address \|\| '',/,
  `address: item.保險處所 || item.标的位置 || item.address || '',`
);

content = content.replace(
  /region: item\.分區 \|\| item\.region \|\| '',/,
  `region: item.分區 || item.parish || item.region || '',`
);

content = content.replace(
  /policy_id: item\.保單號 \|\| item\.policy_id \|\| '',/,
  `policy_id: item.保單號 || item.policyno || item.policy_id || '',`
);

content = content.replace(
  /occupancy: item\.佔用性質 \|\| item\.occupancy,/,
  `occupancy: item.佔用性質 || item.occupation_desc || item.occupancy,`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ PortfolioMap.tsx updated successfully!');
console.log('Changes made:');
console.log('  1. Added region prop to interface');
console.log('  2. Updated function signature');
console.log('  3. Dynamic defaultCenter based on region');
console.log('  4. Region-specific data loading paths');
console.log('  5. GeoJSON support for Macau');
console.log('  6. Multi-region field name support');
