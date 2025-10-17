"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true') {
      // 已登录，跳转到城市空间元素页面
      router.push('/cityinfo');
    } else {
      // 未登录，跳转到登录页
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">正在跳转...</p>
    </div>
  );
}