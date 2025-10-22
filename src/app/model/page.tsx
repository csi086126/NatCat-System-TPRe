"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Catastrophe Model 页面 - 直接重定向到 /oasis (移除二次登录)
export default function Component() {
  const router = useRouter();
  
  useEffect(() => {
    // 直接跳转到 oasis 页面，不需要二次登录
    router.push('/oasis');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600">Loading Catastrophe Model...</p>
    </div>
  );
}