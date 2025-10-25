"use client"

// 1. Import necessary React Hooks and components
import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />

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