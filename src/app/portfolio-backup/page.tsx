import { promises as fs } from 'fs';
import path from 'path';
import PortfolioTable from './PortfolioTable';
import PortfolioStats from './PortfolioStats';
import PortfolioMap from './ClientMap';

async function getPortfolioData() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'tphk_portfolio_subset_5000.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error reading portfolio data:', error);
    return [];
  }
}

export default async function PortfolioPage() {
  const data = await getPortfolioData();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
            <p className="text-gray-500 mt-1">TPHK Insurance Portfolio Analysis (Subset: 5000 records)</p>
          </div>
          <div className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </div>
        </div>

        <PortfolioStats data={data} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h2 className="font-semibold text-lg mb-4">Geospatial Distribution</h2>
              <PortfolioMap data={data} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-4 rounded-lg shadow-sm border h-full">
              <h2 className="font-semibold text-lg mb-4">Risk Summary</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-md">
                  <div className="text-sm font-medium text-blue-800">Top Region</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">Kowloon</div>
                  <div className="text-xs text-blue-600 mt-1">Highest concentration of policies</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-md">
                  <div className="text-sm font-medium text-orange-800">Avg. Sum Insured</div>
                  <div className="text-2xl font-bold text-orange-600 mt-1">
                    HKD {(data.reduce((acc: number, item: any) => acc + (Number(item.sum_insured) || 0), 0) / (data.length || 1) / 1000000).toFixed(2)} M
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-md">
                  <div className="text-sm font-medium text-purple-800">Data Quality</div>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Address Completeness</span>
                      <span className="font-bold">98%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-1.5">
                      <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PortfolioTable data={data} />
      </div>
    </div>
  );
}
