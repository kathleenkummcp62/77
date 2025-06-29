import React from 'react';
import { 
  Shield, 
  Settings, 
  Activity, 
  FileText, 
  Upload, 
  Download,
  Server,
  BarChart3,
  Terminal,
  Wifi,
  Database
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'vpn-types', label: 'VPN Types', icon: Shield },
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'generation', label: 'Generation', icon: FileText },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'processing', label: 'Processing', icon: Activity },
  { id: 'results', label: 'Results', icon: Download },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Wifi className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">VPN Control</h1>
            <p className="text-gray-400 text-sm">Management Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200',
                activeTab === item.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 text-sm text-gray-400">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span>System Online</span>
        </div>
      </div>
    </div>
  );
}
