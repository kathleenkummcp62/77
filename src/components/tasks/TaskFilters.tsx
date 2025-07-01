import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Filter, 
  Search, 
  Calendar, 
  Shield, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface TaskFiltersProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    vpnType: string;
  };
  onFilterChange: (name: string, value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function TaskFilters({ filters, onFilterChange, onSearch, onReset }: TaskFiltersProps) {
  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          
          <select
            value={filters.vpnType}
            onChange={(e) => onFilterChange('vpnType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All VPN Types</option>
            <option value="fortinet">Fortinet</option>
            <option value="paloalto">PaloAlto</option>
            <option value="sonicwall">SonicWall</option>
            <option value="sophos">Sophos</option>
            <option value="watchguard">WatchGuard</option>
            <option value="cisco">Cisco</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onReset}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button 
            size="sm" 
            variant="primary"
            onClick={onSearch}
          >
            <Filter className="h-4 w-4 mr-1" />
            Apply Filters
          </Button>
        </div>
      </div>
      
      {/* Active Filters */}
      {(filters.status || filters.priority || filters.vpnType || filters.search) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">Active Filters:</span>
            <div className="flex flex-wrap gap-2">
              {filters.status && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg">
                  {filters.status === 'running' ? (
                    <Play className="h-3 w-3 text-success-600" />
                  ) : filters.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 text-primary-600" />
                  ) : filters.status === 'error' ? (
                    <AlertTriangle className="h-3 w-3 text-error-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-warning-600" />
                  )}
                  <span>Status: {filters.status}</span>
                </div>
              )}
              
              {filters.priority && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg">
                  <AlertTriangle className="h-3 w-3 text-warning-600" />
                  <span>Priority: {filters.priority}</span>
                </div>
              )}
              
              {filters.vpnType && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg">
                  <Shield className="h-3 w-3 text-primary-600" />
                  <span>VPN: {filters.vpnType}</span>
                </div>
              )}
              
              {filters.search && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg">
                  <Search className="h-3 w-3 text-gray-600" />
                  <span>Search: {filters.search}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}