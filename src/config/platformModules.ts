import type { LucideIcon } from 'lucide-react';
import { Activity, Building2, Map, Puzzle } from 'lucide-react';

export interface PlatformModule {
  id: 'risk-map' | 'cat-model' | 'portfolio' | 'extensions';
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  childRoutes?: string[];
  resetRegionOnEnter?: boolean;
  cardClassName: string;
  iconClassName: string;
}

export const platformModules: PlatformModule[] = [
  {
    id: 'risk-map',
    title: 'Risk Map',
    description: 'Interactive risk assessment, multi-hazard mapping, and location intelligence',
    href: '/riskmap',
    icon: Map,
    resetRegionOnEnter: true,
    cardClassName: 'from-slate-600 to-slate-700',
    iconClassName: 'text-slate-600',
  },
  {
    id: 'cat-model',
    title: 'Catastrophe Model',
    description: 'Run catastrophe models, scenario analysis, and loss estimation',
    href: '/model',
    icon: Activity,
    childRoutes: ['/oasis', '/oasislmf'],
    cardClassName: 'from-slate-600 to-slate-700',
    iconClassName: 'text-slate-600',
  },
  {
    id: 'portfolio',
    title: 'Portfolio Management',
    description: 'Manage insured portfolio, exposure analysis, and business distribution',
    href: '/portfolio',
    icon: Building2,
    resetRegionOnEnter: true,
    cardClassName: 'from-slate-600 to-slate-700',
    iconClassName: 'text-slate-600',
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Advanced tools, disaster early warning, real-time simulation, and future modules',
    href: '/fuzhu',
    icon: Puzzle,
    cardClassName: 'from-slate-600 to-slate-700',
    iconClassName: 'text-slate-600',
  },
];

export function isModuleActive(pathname: string, module: PlatformModule): boolean {
  return pathname === module.href || Boolean(module.childRoutes?.includes(pathname));
}