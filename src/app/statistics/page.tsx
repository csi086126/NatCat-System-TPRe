/**
 * Portfolio Statistics Page
 *
 * Multi-level geographic statistics view
 */

'use client';

import { MultiLevelStatistics } from '@/components/statistics/MultiLevelStatistics';

export default function StatisticsPage() {
  return (
    <div className="container mx-auto p-6">
      <MultiLevelStatistics />
    </div>
  );
}
