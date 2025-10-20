"use client"

// 1. 导入所需的 Hooks 和组件
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button"; // 假设这是来自 shadcn/ui 的按钮
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut } from 'lucide-react';

// 2. Header 组件 (保持不变)
const Header = ({ onLogout, activePage }: { onLogout: () => void; activePage?: string }) => {
  return (
    <header className="bg-white shadow-md z-20 sticky top-0">
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
            <li><Link href="/cityinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'cityinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><MapPin size={18} />Geospatial Data Hub</Button></Link></li>
            <li><Link href="/disasterinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'disasterinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li><Link href="/asset"><Button variant="ghost" className={`gap-2 ${activePage === 'asset' ? 'text-blue-900 font-bold text-lg' : ''}`}><Building2 size={18} />Asset management</Button></Link></li>
            <li><Link href="/riskmap"><Button variant="ghost" className={`gap-2 ${activePage === 'riskmap' ? 'text-blue-900 font-bold text-lg' : ''}`}><Map size={18} />Risk map</Button></Link></li>
            <li><Link href="/model"><Button variant="ghost" className={`gap-2 ${activePage === 'model' ? 'text-blue-900 font-bold text-lg' : ''}`}><Activity size={18} />Catastrophe model</Button></Link></li>
            <li><Link href="/fuzhu"><Button variant="ghost" className={`gap-2 ${activePage === 'fuzhu' ? 'text-blue-900 font-bold text-lg' : ''}`}><Puzzle size={18} />Accessibility</Button></Link></li>
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

// 3. SVG 图标组件 (用于用户中心页面)
// 为了代码自包含，将 SVG 图标直接定义为组件
const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.82l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.82l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BellIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ActivityIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// 4. 用户中心页面组件
const UserCenterPage = () => {
  // 使用 state 来管理当前活动的标签页
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection />;
      case 'settings':
        return <AccountSettingsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'activity':
        return <ActivityLogSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Center</h1>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* 侧边栏 */}
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {/* 导航项 */}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('profile'); }}
                className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium ${activeTab === 'profile' ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <UserIcon className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${activeTab === 'profile' ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span className="truncate">Profile</span>
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
                className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium ${activeTab === 'settings' ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <SettingsIcon className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${activeTab === 'settings' ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span className="truncate">Account Settings</span>
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('notifications'); }}
                className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium ${activeTab === 'notifications' ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <BellIcon className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${activeTab === 'notifications' ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span className="truncate">Notifications</span>
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('activity'); }}
                className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium ${activeTab === 'activity' ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <ActivityIcon className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${activeTab === 'activity' ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span className="truncate">Activity Log</span>
              </a>
            </nav>
          </aside>

          {/* 内容区 */}
          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

// 5. 内容区域的各个子组件
const Card = ({ children, title, footer }) => (
  <div className="bg-white shadow-md rounded-lg overflow-hidden">
    <div className="px-4 py-5 sm:px-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
    </div>
    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">{children}</div>
    {footer && <div className="bg-gray-50 px-4 py-4 sm:px-6">{footer}</div>}
  </div>
);

const ProfileSection = () => (
  <Card title="Profile Information" footer={
    <div className="flex justify-end">
      <Button>Update Profile</Button>
    </div>
  }>
    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
        <input type="text" id="full_name" defaultValue="John Doe" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
        <input type="email" id="email" defaultValue="john.doe@taiping.com" readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
        <input type="text" id="role" defaultValue="Risk Analyst" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
        <input type="text" id="department" defaultValue="Catastrophe Modeling" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
    </div>
  </Card>
);

const AccountSettingsSection = () => (
  <Card title="Account Settings">
    <div className="space-y-6">
      {/* 修改密码 */}
      <div>
        <h4 className="text-md font-medium text-gray-800">Change Password</h4>
        <div className="mt-4 grid grid-cols-1 gap-y-6">
          <div>
            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">Current Password</label>
            <input type="password" id="current_password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" id="new_password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input type="password" id="confirm_password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button>Change Password</Button>
        </div>
      </div>
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-800">Two-Factor Authentication</h4>
        <p className="text-sm text-gray-500 mt-1">Enhance your account's security.</p>
        <div className="mt-4">
          <Button variant="outline">Enable 2FA</Button>
        </div>
      </div>
    </div>
  </Card>
);

const NotificationsSection = () => (
  <Card title="Notification Settings">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-800">System Alerts</h4>
          <p className="text-sm text-gray-500">Get notified about critical system updates and maintenance.</p>
        </div>
        <label htmlFor="system_alerts" className="switch">
          <input type="checkbox" id="system_alerts" defaultChecked />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-800">Model Run Completions</h4>
          <p className="text-sm text-gray-500">Receive an email when a catastrophe model run is complete.</p>
        </div>
        <label htmlFor="model_completions" className="switch">
          <input type="checkbox" id="model_completions" defaultChecked />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-800">Weekly Summary</h4>
          <p className="text-sm text-gray-500">Get a weekly summary of your activities and system usage.</p>
        </div>
        <label htmlFor="weekly_summary" className="switch">
          <input type="checkbox" id="weekly_summary" />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
    {/* 简单的 CSS 来实现开关样式 */}
    <style jsx>{`
      .switch { position: relative; display: inline-block; width: 40px; height: 24px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
      .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
      input:checked + .slider { background-color: #2563eb; }
      input:checked + .slider:before { transform: translateX(16px); }
      .slider.round { border-radius: 24px; }
      .slider.round:before { border-radius: 50%; }
    `}</style>
  </Card>
);

const ActivityLogSection = () => {
  const activities = [
    { id: 1, action: 'Logged in', ip: '192.168.1.100', time: '2 hours ago' },
    { id: 2, action: 'Ran catastrophe model "Shanghai_Flood_Oct2025"', ip: '192.168.1.100', time: '3 hours ago' },
    { id: 3, action: 'Updated asset "Pudong Financial Center"', ip: '192.168.1.100', time: '1 day ago' },
    { id: 4, action: 'Viewed risk map for "Guangzhou"', ip: '192.168.1.100', time: '1 day ago' },
    { id: 5, action: 'Logged out', ip: '192.168.1.100', time: '2 days ago' },
  ];

  return (
    <Card title="Recent Activity">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map(activity => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{activity.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.ip}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};


// 6. 主组件，现在渲染 Header 和新的用户中心页面
export default function Component() {
  const router = useRouter();
  
  // 退出登录处理
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
  return (
    <div className="flex flex-col h-screen">
      <Header onLogout={handleLogout} activePage="usercenter" />
      <UserCenterPage />
    </div>
  );
}