import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useAppSelector } from '../../store';

interface PerformanceChartProps {
  title: string;
  metric: 'rps' | 'cpu' | 'memory' | 'network';
  height?: number;
  showLegend?: boolean;
}

export function PerformanceChart({ title, metric, height = 300, showLegend = true }: PerformanceChartProps) {
  const { scanHistory } = useAppSelector(state => state.scanner);
  const { serverHistory } = useAppSelector(state => state.servers);
  const isConnected = useAppSelector(state => state.scanner.isConnected);
  
  const chartData = useMemo(() => {
    return scanHistory.map(point => ({
      timestamp: point.timestamp,
      time: format(new Date(point.timestamp), 'HH:mm'),
      rps: point.stats.rps || 0,
      processed: point.stats.processed || 0,
    }));
  }, [scanHistory]);
  
  const serverPerformanceData = useMemo(() => {
    const result: Record<string, any>[] = [];
    
    // If serverHistory is empty, return empty array
    if (!serverHistory || Object.keys(serverHistory).length === 0) {
      return [];
    }
    
    // Get all timestamps from all servers
    const allTimestamps = new Set<number>();
    Object.values(serverHistory).forEach(history => {
      history.forEach(point => {
        allTimestamps.add(point.timestamp);
      });
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Create data points for each timestamp
    sortedTimestamps.forEach(timestamp => {
      const dataPoint: Record<string, any> = {
        timestamp,
        time: format(new Date(timestamp), 'HH:mm'),
      };
      
      // Add data for each server
      Object.entries(serverHistory).forEach(([ip, history]) => {
        // Find the closest point for this timestamp
        const point = history.find(p => p.timestamp === timestamp);
        if (point) {
          dataPoint[`${ip}_cpu`] = point.cpu;
          dataPoint[`${ip}_memory`] = point.memory;
          dataPoint[`${ip}_rps`] = point.rps;
        }
      });
      
      result.push(dataPoint);
    });
    
    return result;
  }, [serverHistory]);
  
  const getMetricColor = () => {
    switch (metric) {
      case 'rps': return '#0ea5e9';
      case 'cpu': return '#f59e0b';
      case 'memory': return '#8b5cf6';
      case 'network': return '#22c55e';
      default: return '#0ea5e9';
    }
  };
  
  const renderRpsChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey="rps" 
          stroke="#0ea5e9" 
          strokeWidth={2}
          name="Requests/Second" 
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  
  const renderServerMetricChart = () => {
    const metricKey = metric === 'rps' ? 'rps' : metric;
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={serverPerformanceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {Object.keys(serverHistory || {}).map((ip, index) => (
            <Line
              key={ip}
              type="monotone"
              dataKey={`${ip}_${metricKey}`}
              stroke={`hsl(${index * 40}, 70%, 50%)`}
              strokeWidth={2}
              name={`${ip} ${metric.toUpperCase()}`}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Badge variant={isConnected ? "success" : "gray"}>
          {isConnected ? "Live Data" : "Offline"}
        </Badge>
      </div>
      {metric === 'rps' ? renderRpsChart() : renderServerMetricChart()}
    </Card>
  );
}