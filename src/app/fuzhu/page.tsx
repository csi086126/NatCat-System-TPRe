"use client"

import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Activity, Cloud, FileSearch, Globe } from 'lucide-react';

interface ExtensionModule {
  id: string;
  name: string;
  icon: any;
  category: string;
  description: string;
  status: 'active' | 'coming-soon';
  url?: string;
}

const extensionModules: ExtensionModule[] = [
  {
    id: 'early-warning',
    name: '灾前预警系统',
    icon: AlertTriangle,
    category: '灾前预警',
    description: '实时监测、多级预警、台风追踪、降雨预报',
    status: 'coming-soon'
  },
  {
    id: 'real-time-simulation',
    name: '灾害实时模拟',
    icon: Activity,
    category: '实时模拟',
    description: '实时监测、损失估算、情景模拟',
    status: 'coming-soon'
  },
  {
    id: 'earth-nullschool',
    name: 'Earth Nullschool',
    icon: Globe,
    category: '实时气象',
    description: '全球实时气象可视化（850hPa风速）',
    status: 'active',
    url: 'https://earth.nullschool.net/#current/wind/isobaric/850hPa/orthographic'
  },
  {
    id: 'post-disaster',
    name: '灾后损失分析',
    icon: FileSearch,
    category: '灾后分析',
    description: '损失评估、理赔分析、恢复追踪',
    status: 'coming-soon'
  },
  {
    id: 'climate-change',
    name: '气候变化分析',
    icon: Cloud,
    category: '气候变化',
    description: '长期风险预测、TCFD报告',
    status: 'coming-soon'
  }
];

export default function Component() {
  const [selectedModule, setSelectedModule] = useState<string>('earth-nullschool');
  const currentModule = extensionModules.find(m => m.id === selectedModule);
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r bg-white px-4 py-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🧩 扩展模块</h3>
          
          <div className="space-y-2">
            {extensionModules.map((module) => {
              const ModuleIcon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setSelectedModule(module.id)}
                  disabled={module.status === 'coming-soon'}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${ 
                    selectedModule === module.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  } ${module.status === 'coming-soon' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <ModuleIcon className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{module.name}</h4>
                        {module.status === 'coming-soon' && (
                          <span className="text-xs text-gray-500">待开发</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{module.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative bg-white">
          {currentModule?.url ? (
            <iframe
              src={currentModule.url}
              title={currentModule.name}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
              <Card className="max-w-md shadow-lg">
                <CardHeader className="text-center">
                  {currentModule && (
                    <>
                      <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <currentModule.icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <CardTitle className="text-xl">{currentModule.name}</CardTitle>
                    </>
                  )}
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  {currentModule && (
                    <>
                      <p className="text-gray-600 text-sm">{currentModule.description}</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          🚧 功能开发中，待需求确认
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}