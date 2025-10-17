"use client"

// 1. Import necessary React Hooks and components
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut } from 'lucide-react';

// 2. MOCK DATA FOR A SELECTED WARNING MESSAGE
// - This data populates the right sidebar with warning details.
const mockWarning = {
  id: 'WARN-FL-2024-10-005',
  type: 'Flood Warning',
  severity: 'Severe',
  status: 'Active',
  affectedArea: 'Hong Kong Island, Kowloon, New Territories',
  issueTime: '2024-10-26 08:30 AM (HKT)',
  headline: 'Severe Flood Warning Issued for Hong Kong',
  description: 'Due to the impact of Super Typhoon Kai-tak, continuous heavy rainfall is expected to cause severe flooding in low-lying and coastal areas. All residents are advised to take immediate precautions, move to higher ground, and avoid waterfront activities. Emergency services are on high alert and evacuation orders may be issued for high-risk zones.',
  source: 'Hong Kong Observatory',
};


// 3. Header Component
// - This component remains unchanged and provides top-level navigation.
const Header = ({ onLogout, activePage }: { onLogout: () => void; activePage?: string }) => {
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
          
            <li><Link href="/cityinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'cityinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><MapPin size={18} />Urban Spatial Elements</Button></Link></li>
            <li className="ml-auto"><Link href="/disasterinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'disasterinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li className="ml-auto"><Link href="/asset"><Button variant="ghost" className={`gap-2 ${activePage === 'asset' ? 'text-blue-900 font-bold text-lg' : ''}`}><Building2 size={18} />Asset management</Button></Link></li>
            <li className="ml-auto"><Link href="/riskmap"><Button variant="ghost" className={`gap-2 ${activePage === 'riskmap' ? 'text-blue-900 font-bold text-lg' : ''}`}><Map size={18} />Risk map</Button></Link></li>
            <li className="ml-auto"><Link href="/model"><Button variant="ghost" className={`gap-2 ${activePage === 'model' ? 'text-blue-900 font-bold text-lg' : ''}`}><Activity size={18} />Catastrophe model</Button></Link></li>
            <li className="ml-auto"><Link href="/fuzhu"><Button variant="ghost" className={`gap-2 ${activePage === 'fuzhu' ? 'text-blue-900 font-bold text-lg' : ''}`}><Puzzle size={18} />Accessibility</Button></Link></li>
            <li><Link href="/usercenter"><Button variant="ghost" className={`gap-2 ${activePage === 'usercenter' ? 'text-blue-900 font-bold text-lg' : ''}`}><User size={18} />User centre</Button></Link></li>
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

// 4. Main Component
// - The right sidebar has been updated to show warning message details.
export default function Component() {
  const router = useRouter();
  
  // 退出登录处理
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
  // State to hold the currently selected warning for the right detail view sidebar.
  const [selectedWarning, setSelectedWarning] = useState(mockWarning);
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header onLogout={handleLogout} activePage="fuzhu" />

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Unchanged */}
        <aside className="w-80 flex-shrink-0 border-r bg-white pl-8 pr-8 py-4 overflow-y-auto space-y-1">

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Input type="checkbox" id="warnings" className="h-4 w-4" />
                <Label htmlFor="warnings" className="text-base">Warning Push / Message Center</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input type="checkbox" id="help-center" className="h-4 w-4" />
                <Label htmlFor="help-center" className="text-base">Help Center / Documentation</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input type="checkbox" id="user-permissions" className="h-4 w-4" defaultChecked />
                <Label htmlFor="user-permissions" className="text-base">User Permissions & Logs</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input type="checkbox" id="system-settings" className="h-4 w-4" />
                <Label htmlFor="system-settings" className="text-base">System Settings</Label>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Central Area - Unchanged */}
        <main className="flex-1 relative bg-black">
          <iframe
            src="https://earth.nullschool.net/"
            title="Earth Nullschool"
            className="w-full h-full border-0"
          ></iframe>
        </main>

        {/* Right Sidebar for Warning Message Details - MODIFIED */}
        <aside className="w-96 flex-shrink-0 border-l bg-white p-4 overflow-y-auto space-y-1">
          <h2 className="text-xl font-bold mb-2 pl-2">Warning Message Details</h2>
          
          {selectedWarning ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedWarning.headline}</CardTitle>
                  <p className="text-sm text-gray-500 pt-1">{selectedWarning.id}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Type:</span> <span className="font-medium">{selectedWarning.type}</span></div>
                  <div className="flex justify-between"><span>Severity:</span> <span className="font-medium text-red-600">{selectedWarning.severity}</span></div>
                  <div className="flex justify-between"><span>Status:</span> <span className="font-medium text-green-600">{selectedWarning.status}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Issue Time:</span> <span className="font-medium">{selectedWarning.issueTime}</span></div>
                  <div className="flex justify-between"><span>Affected Area:</span> <span className="font-medium text-right">{selectedWarning.affectedArea}</span></div>
                  <div className="flex justify-between"><span>Source:</span> <span className="font-medium">{selectedWarning.source}</span></div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Warning Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">
                    {selectedWarning.description}
                  </p>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-gray-500">No warning message selected.</p>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}