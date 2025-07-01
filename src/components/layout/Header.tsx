import React from 'react';
import { Button } from '../ui/Button';
import { useAppSelector, useAppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { User, LogOut, Bell, Menu, X } from 'lucide-react';
import { toggleSidebar } from '../../store/slices/uiSlice';

export function Header() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { sidebarCollapsed } = useAppSelector(state => state.ui);
  const { notifications } = useAppSelector(state => state.ui);
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };
  
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4">
      <div className="flex-1 flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2 p-2"
          onClick={handleToggleSidebar}
        >
          {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
        
        <h1 className="text-xl font-semibold text-gray-800">VPN Bruteforce Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Button variant="ghost" className="p-2">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-error-500 text-white text-xs flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-primary-100 rounded-full p-2">
            <User className="h-5 w-5 text-primary-600" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user?.username || 'Guest'}</p>
            <p className="text-xs text-gray-500">{user?.role || 'Not logged in'}</p>
          </div>
        </div>
        
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}