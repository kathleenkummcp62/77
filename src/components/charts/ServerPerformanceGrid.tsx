import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAppSelector } from '../../store';

export function ServerPerformanceGrid() {
  const { servers } = useAppSelector(state => state.servers);
  const isConnected = useAppSelector(state => state.scanner.isConnected);
  
  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Server Health Overview</h3>
        <Badge variant={isConnected ? "success" : "gray"}>
          {isConnected ? "Live Data" : "Offline"}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {servers && servers.length > 0 ? servers.map((server) => (
          <div key={server.ip} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Server className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{server.ip}</h4>
                  <p className="text-sm text-gray-600">Uptime: {server.uptime}</p>
                </div>
              </div>
              <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                {server.status}
              </Badge>
            </div>

            {/* Resource Usage */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">CPU Usage</span>
                  <span className="font-medium">{server.cpu}%</span>
                </div>
                <ProgressBar 
                  value={server.cpu} 
                  color={server.cpu > 80 ? 'error' : server.cpu > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Memory</span>
                  <span className="font-medium">{server.memory}%</span>
                </div>
                <ProgressBar 
                  value={server.memory} 
                  color={server.memory > 80 ? 'error' : server.memory > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Disk Usage</span>
                  <span className="font-medium">{server.disk}%</span>
                </div>
                <ProgressBar 
                  value={server.disk} 
                  color={server.disk > 80 ? 'error' : server.disk > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-lg font-bold text-success-600">{server.goods}</p>
                <p className="text-xs text-gray-600">Valid</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary-600">{server.speed}</p>
                <p className="text-xs text-gray-600">Speed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-warning-600">{server.errors}</p>
                <p className="text-xs text-gray-600">Errors</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center text-gray-500 py-8">
            No server data available
          </div>
        )}
      </div>
    </Card>
  );
}