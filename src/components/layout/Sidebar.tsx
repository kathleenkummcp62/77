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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Bell,
  Import,
  FileInput,
  ListTodo,
  FolderSearch
} from "lucide-react";
import { clsx } from "clsx";
import { useAppSelector, useAppDispatch } from "../../store";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { hasRole } from "../../lib/auth";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, role: "viewer" },
  { id: "vpn-types", label: "VPN Types", icon: Shield, role: "viewer" },
  { id: "servers", label: "Servers", icon: Server, role: "user" },
  { id: "generation", label: "Generation", icon: FileText, role: "user" },
  { id: "upload", label: "Upload", icon: Upload, role: "user" },
  { id: "processing", label: "Processing", icon: Activity, role: "user" },
  { id: "results", label: "Results", icon: Download, role: "viewer" },
  { id: "monitoring", label: "Monitoring", icon: Activity, role: "viewer" },
  { id: "reports", label: "Reports", icon: PieChart, role: "viewer" },
  { id: "scheduler", label: "Task Scheduler", icon: Calendar, role: "user" },
  { id: "vpn-import", label: "Import/Export", icon: FileInput, role: "user" },
  { id: "task-creator", label: "Task Creator", icon: ListTodo, role: "user" },
  { id: "results-viewer", label: "Results Viewer", icon: FolderSearch, role: "viewer" },
  { id: "data", label: "Data Store", icon: FileText, role: "user" },
  { id: "database", label: "Database", icon: Database, role: "admin" },
  { id: "terminal", label: "Terminal", icon: Terminal, role: "admin" },
  { id: "testing", label: "Testing", icon: TestTube, role: "user" },
  { id: "security", label: "Security Audit", icon: ShieldCheck, role: "admin" },
  { id: "settings", label: "Settings", icon: Settings, role: "user" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const isConnected = useAppSelector(state => state.scanner.isConnected);
  const sidebarCollapsed = useAppSelector(state => state.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    hasRole(item.role as 'admin' | 'user' | 'viewer')
  );

  return (
    <div className={clsx(
      "bg-gray-900 text-white h-screen flex flex-col transition-all duration-300 relative",
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
        {filteredMenuItems.map((item) => {
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
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
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
      
      {/* Collapse/Expand button */}
      <button 
        className="absolute -right-3 top-20 bg-gray-800 text-white p-1 rounded-full border border-gray-700"
        onClick={handleToggleSidebar}
      >
        {sidebarCollapsed ? 
          <ChevronRight className="h-4 w-4" /> : 
          <ChevronLeft className="h-4 w-4" />
        }
      </button>
    </div>
  );
}