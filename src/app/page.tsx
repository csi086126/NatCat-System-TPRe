"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, User, LogOut,
  TrendingUp, Shield, BarChart3, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';
import { useRegion } from "@/contexts/RegionContext";
import { platformModules } from '@/config/platformModules';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { switchRegion } = useRegion();
  const { user, isLoading, logout } = useAuth();
  const [showStats, setShowStats] = useState(false); // 控制统计信息的显示/隐藏

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Background Map Image - World view centered on Hong Kong */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'url("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/3")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/taipinglogo.png"
              alt="China Taiping Logo"
              width={280}
              height={31}
            />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/usercenter">
              <Button variant="ghost" className="gap-2">
                <User size={18} />
                {user?.display_name || user?.email || 'User'}
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to Natural Catastrophe Risk Platform
          </h1>
        </div>

        {/* Modules Grid - 2x2 Layout */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Modules</h2>
          <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
            {platformModules.map((module) => (
              <div key={module.href} onClick={() => {
                if (module.resetRegionOnEnter) {
                  switchRegion('worldwide');
                }
                router.push(module.href);
              }}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-2 hover:border-gray-300 bg-slate-50">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.cardClassName} flex items-center justify-center flex-shrink-0`}>
                        <module.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl">{module.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm text-gray-600">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className={`w-full ${module.iconClassName}`}>
                      Enter Module →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats - Moved to bottom - Collapsible */}
        <div className="mt-24 mb-8">
          <div 
            className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
            onClick={() => setShowStats(!showStats)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Platform Statistics</h2>
              <Button variant="outline" size="sm" className="gap-2">
                {showStats ? (
                  <>
                    Hide
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {showStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Regions</p>
                      <p className="text-3xl font-bold text-gray-900">7</p>
                    </div>
                    <MapPin className="w-12 h-12 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Disaster Events</p>
                      <p className="text-3xl font-bold text-gray-900">1,247</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-orange-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Risk Layers</p>
                      <p className="text-3xl font-bold text-gray-900">35</p>
                    </div>
                    <BarChart3 className="w-12 h-12 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Models</p>
                      <p className="text-3xl font-bold text-gray-900">12</p>
                    </div>
                    <Shield className="w-12 h-12 text-purple-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© 2025 Taiping Reinsurance Co., Ltd. All rights reserved.</p>
          <p className="mt-2">Natural Catastrophe Risk Platform v2.0 - Last updated: October 22, 2025</p>
        </div>
      </main>
      </div>
    </div>
  );
}