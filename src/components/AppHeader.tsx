"use client"

import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut } from 'lucide-react';

interface AppHeaderProps {
  onLogout: () => void;
}

export default function AppHeader({ onLogout }: AppHeaderProps) {
  return (
    <header className="bg-white shadow-md z-20">
      <div className="mx-auto px-4 py-2 flex justify-between items-center ml-2">
        <div className="flex items-center">
          <Image
            src="/taipinglogo.png"
            alt="China Taiping Logo"
            width={360}
            height={40}
          />
          <span className="ml-2 text-xl font-semibold"></span>
        </div>
        <nav className="flex-grow flex justify-end items-center">
          <ul className="flex space-x-4">
            <li><Link href="/dashboard"><Button variant="ghost" className="gap-2"><Home size={18} />Dashboard</Button></Link></li>
            <li><Link href="/cityinfo"><Button variant="ghost" className="gap-2"><MapPin size={18} />Urban Spatial Elements</Button></Link></li>
            <li className="ml-auto"><Link href="/disasterinfo"><Button variant="ghost" className="gap-2"><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li className="ml-auto"><Link href="/asset"><Button variant="ghost" className="gap-2"><Building2 size={18} />Asset management</Button></Link></li>
            <li className="ml-auto"><Link href="/riskmap"><Button variant="ghost" className="gap-2"><Map size={18} />Risk map</Button></Link></li>
            <li className="ml-auto"><Link href="/model"><Button variant="ghost" className="gap-2"><Activity size={18} />Catastrophe model</Button></Link></li>
            <li className="ml-auto"><Link href="/fuzhu"><Button variant="ghost" className="gap-2"><Puzzle size={18} />Accessibility</Button></Link></li>
            <li><Link href="/usercenter"><Button variant="ghost" className="gap-2"><User size={18} />User centre</Button></Link></li>
          </ul>
          <Button variant="outline" onClick={onLogout} className="ml-4 gap-2">
            <LogOut size={18} />
            退出登录
          </Button>
        </nav>
      </div>
    </header>
  );
}
