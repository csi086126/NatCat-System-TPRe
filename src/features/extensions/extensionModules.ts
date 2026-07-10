import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, Cloud, FileSearch, Globe } from 'lucide-react';

export interface ExtensionModule {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
  description: string;
  status: 'active' | 'coming-soon';
  url?: string;
}

export const extensionModules: ExtensionModule[] = [
  {
    id: 'early-warning',
    name: '灾前预警系统',
    icon: AlertTriangle,
    category: '灾前预警',
    description: '实时监测、多级预警、台风追踪、降雨预报',
    status: 'coming-soon',
  },
  {
    id: 'real-time-simulation',
    name: '灾害实时模拟',
    icon: Activity,
    category: '实时模拟',
    description: '实时监测、损失估算、情景模拟',
    status: 'coming-soon',
  },
  {
    id: 'earth-nullschool',
    name: 'Earth Nullschool',
    icon: Globe,
    category: '实时气象',
    description: '全球实时气象可视化（850hPa风速）',
    status: 'active',
    url: 'https://earth.nullschool.net/#current/wind/isobaric/850hPa/orthographic',
  },
  {
    id: 'post-disaster',
    name: '灾后损失分析',
    icon: FileSearch,
    category: '灾后分析',
    description: '损失评估、理赔分析、恢复追踪',
    status: 'coming-soon',
  },
  {
    id: 'climate-change',
    name: '气候变化分析',
    icon: Cloud,
    category: '气候变化',
    description: '长期风险预测、TCFD报告',
    status: 'coming-soon',
  },
];