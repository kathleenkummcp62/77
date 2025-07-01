import React from "react";
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
  Database,
  TestTube,
  ShieldCheck,
  PieChart,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppSelector } from "../../store";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "vpn-types", label: "VPN Types", icon: Shield },
  { id: "servers", label: "Servers", icon: Server },
  { id: "generation", label: "Generation", icon: FileText },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "processing", label: "Processing", icon: Activity },
  { id: "results", label: "Results", icon: Download },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "reports", label: "Reports", icon: PieChart },
  { id: "data", label: "Data Store", icon: FileText },
  { id: "database", label: "Database", icon: Database },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "testing", label: "Testing", icon: TestTube },
  { id: "security", label: "Security Audit", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const isConnected = useAppSelector(state => state.scanner.isConnected);
  const sidebarCollapsed = useAppSelector(state => state.ui.sidebarCollapsed);

  return (
    <div className={clsx(
      "bg-gray-900 text-white h-screen flex flex-col transition-all duration-300",
      sidebarCollapsed ? "w-20" : "w-64"
    )}>
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Wifi className="h-6 w-6" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold">VPN Control</h1>
              <p className="text-gray-400 text-sm">Management Dashboard</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                activeTab === item.id
                  ? "bg-primary-600 text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 text-sm text-gray-400">
          <div className={clsx(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-success-500 animate-pulse" : "bg-error-500"
          )}></div>
          {!sidebarCollapsed && (
            <span>{isConnected ? "System Online" : "Disconnected"}</span>
          )}
        </div>
      </div>
    </div>
  );
}