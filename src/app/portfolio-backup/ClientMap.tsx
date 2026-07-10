'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const PortfolioMap = dynamic(() => import('./PortfolioMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

export default function ClientMap({ data }: { data: any[] }) {
  return <PortfolioMap data={data} />;
}
