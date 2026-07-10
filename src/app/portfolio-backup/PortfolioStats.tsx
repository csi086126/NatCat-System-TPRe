'use client';

interface PortfolioItem {
  sum_insured: number;
  location?: any;
}

interface PortfolioStatsProps {
  data: PortfolioItem[];
}

export default function PortfolioStats({ data }: PortfolioStatsProps) {
  const totalPolicies = data.length;
  const totalSumInsured = data.reduce((sum, item) => sum + (Number(item.sum_insured) || 0), 0);
  const geocodedCount = data.filter(item => item.location).length;
  const geocodedPercentage = totalPolicies > 0 ? ((geocodedCount / totalPolicies) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Policies</h3>
        <div className="text-2xl font-bold text-gray-900">{totalPolicies.toLocaleString()}</div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sum Insured</h3>
        <div className="text-2xl font-bold text-blue-600">
          HKD {(totalSumInsured / 1000000).toFixed(2)} M
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Geocoding Coverage</h3>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-green-600">{geocodedPercentage}%</div>
          <div className="text-sm text-gray-500">({geocodedCount} mapped)</div>
        </div>
      </div>
    </div>
  );
}
