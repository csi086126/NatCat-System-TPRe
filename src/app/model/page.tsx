"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';

export default function Component() {
  const router = useRouter();
  useEffect(() => {
    router.push('/oasis');
  }, [router]);
  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading Catastrophe Model...</p>
      </div>
    </div>
  );
}