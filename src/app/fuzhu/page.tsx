"use client"

// 1. Import necessary React Hooks and components
import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

// 3. Main Component
// - The right sidebar has been updated to show warning message details.
export default function Component() {
  // State to hold the currently selected warning for the right detail view sidebar.
  const [selectedWarning, setSelectedWarning] = useState(mockWarning);
  
  // State for selected extension module
  const [selectedModule, setSelectedModule] = useState<string>('earth-nullschool');
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Unchanged */}
        <aside className="w-80 flex-shrink-0 border-r bg-white pl-8 pr-8 py-4 overflow-y-auto space-y-1">

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="warnings" 
                  className="h-4 w-4"
                  checked={selectedModule === 'warnings'}
                  onChange={() => setSelectedModule('warnings')}
                />
                <Label htmlFor="warnings" className="text-base">Warning Push / Message Center</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="help-center" 
                  className="h-4 w-4"
                  checked={selectedModule === 'help-center'}
                  onChange={() => setSelectedModule('help-center')}
                />
                <Label htmlFor="help-center" className="text-base">Help Center / Documentation</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="user-permissions" 
                  className="h-4 w-4"
                  checked={selectedModule === 'user-permissions'}
                  onChange={() => setSelectedModule('user-permissions')}
                />
                <Label htmlFor="user-permissions" className="text-base">User Permissions & Logs</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="system-settings" 
                  className="h-4 w-4"
                  checked={selectedModule === 'system-settings'}
                  onChange={() => setSelectedModule('system-settings')}
                />
                <Label htmlFor="system-settings" className="text-base">System Settings</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="earth-nullschool" 
                  className="h-4 w-4"
                  checked={selectedModule === 'earth-nullschool'}
                  onChange={() => setSelectedModule('earth-nullschool')}
                />
                <Label htmlFor="earth-nullschool" className="text-base">Earth Nullschool (Weather)</Label>
              </div>
            </CardContent>
          </Card>

          {/* HKUST Catastrophe Model Card */}
          <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800">🎓 HKUST Catastrophe Model</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Original implementation from HKUST research</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Input 
                  type="checkbox" 
                  id="hkust-catastrophe" 
                  className="h-4 w-4"
                  checked={selectedModule === 'hkust-catastrophe'}
                  onChange={() => setSelectedModule('hkust-catastrophe')}
                />
                <Label htmlFor="hkust-catastrophe" className="text-base font-semibold text-blue-700">
                  HKUST Catastrophe Model
                </Label>
              </div>
              
              <div className="p-3 bg-white rounded border border-blue-200 text-xs text-gray-700">
                <p className="font-semibold text-blue-700 mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Stochastic event simulation</li>
                  <li>Portfolio loss analysis</li>
                  <li>Monte Carlo simulation</li>
                  <li>Shapefile visualization</li>
                </ul>
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open('/oasis', '_blank')}
                size="sm"
              >
                Open in New Tab
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Central Area - Dynamic content based on selection */}
        <main className="flex-1 relative bg-black">
          {selectedModule === 'earth-nullschool' && (
            <iframe
              src="https://earth.nullschool.net/"
              title="Earth Nullschool"
              className="w-full h-full border-0"
            ></iframe>
          )}
          
          {selectedModule === 'hkust-catastrophe' && (
            <div className="w-full h-full bg-white overflow-auto">
              <iframe
                src="/oasis"
                title="HKUST Catastrophe Model"
                className="w-full h-full border-0"
              ></iframe>
            </div>
          )}
          
          {selectedModule !== 'earth-nullschool' && selectedModule !== 'hkust-catastrophe' && (
            <div className="flex items-center justify-center h-full">
              <Card className="bg-white p-8">
                <CardContent>
                  <p className="text-lg text-gray-600">
                    Module "{selectedModule}" is under development.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Right Sidebar - Dynamic content based on selected module */}
        <aside className="w-96 flex-shrink-0 border-l bg-white p-4 overflow-y-auto space-y-1">
          <h2 className="text-xl font-bold mb-2 pl-2">
            {selectedModule === 'hkust-catastrophe' ? 'HKUST Model Info' : 'Warning Message Details'}
          </h2>
          
          {selectedModule === 'hkust-catastrophe' ? (
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">🎓 HKUST Catastrophe Model</CardTitle>
                  <p className="text-sm text-gray-600 pt-1">Research-based catastrophe modeling platform</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-2">About</h4>
                    <p className="text-gray-700">
                      This is the original catastrophe modeling system developed at HKUST. 
                      It provides comprehensive tools for stochastic event simulation and portfolio risk analysis.
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-2">Key Features</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>10,000-year stochastic event catalog</li>
                      <li>Monte Carlo loss simulation</li>
                      <li>Portfolio exposure management</li>
                      <li>Geographic visualization (Leaflet + Shapefile)</li>
                      <li>Statistical analysis & reporting</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-2">Usage</h4>
                    <p className="text-gray-700 text-xs">
                      1. Upload property portfolio (CSV)<br/>
                      2. Configure simulation parameters<br/>
                      3. Run stochastic analysis<br/>
                      4. View results on map & download reports
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open('/oasis', '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : selectedWarning ? (
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