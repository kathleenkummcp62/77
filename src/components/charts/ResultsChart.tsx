import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAppSelector } from '../../store';

interface ResultsChartProps {
  type: 'area' | 'bar' | 'pie';
  title: string;
  height?: number;
  showLegend?: boolean;
}

export function ResultsChart({ type, title, height = 300, showLegend = true }: ResultsChartProps) {
  const { scanHistory } = useAppSelector(state => state.scanner);
  const { statistics } = useAppSelector(state => state.results);
  const isConnected = useAppSelector(state => state.scanner.isConnected);
  
  const timeSeriesData = useMemo(() => {
    return scanHistory.map(point => ({
      timestamp: point.timestamp,
      time: format(new Date(point.timestamp), 'HH:mm'),
      valid: point.stats.goods || 0,
      invalid: point.stats.bads || 0,
      errors: point.stats.errors || 0,
      rps: point.stats.rps || 0,
    }));
  }, [scanHistory]);
  
  const vpnTypeData = useMemo(() => {
    return Object.entries(statistics.vpnTypeStats).map(([type, stats]) => ({
      name: type,
      valid: stats.valid,
      invalid: stats.invalid,
      successRate: stats.successRate,
    }));
  }, [statistics.vpnTypeStats]);
  
  const errorDistribution = useMemo(() => {
    return [
      { name: 'Timeout', value: 45 },
      { name: 'Connection', value: 25 },
      { name: 'Auth Failed', value: 15 },
      { name: 'Rate Limited', value: 10 },
      { name: 'Other', value: 5 },
    ];
  }, []);
  
  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6'];
  
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={timeSeriesData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        <Area 
          type="monotone" 
          dataKey="valid" 
          stackId="1"
          stroke="#22c55e" 
          fill="#22c55e" 
          fillOpacity={0.6} 
          name="Valid"
        />
        <Area 
          type="monotone" 
          dataKey="invalid" 
          stackId="1"
          stroke="#ef4444" 
          fill="#ef4444" 
          fillOpacity={0.6} 
          name="Invalid"
        />
        <Area 
          type="monotone" 
          dataKey="errors" 
          stackId="1"
          stroke="#f59e0b" 
          fill="#f59e0b" 
          fillOpacity={0.6} 
          name="Errors"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
  
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={vpnTypeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        <Bar dataKey="valid" fill="#22c55e" name="Valid" />
        <Bar dataKey="invalid" fill="#ef4444" name="Invalid" />
      </BarChart>
    </ResponsiveContainer>
  );
  
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={errorDistribution}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {errorDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        {showLegend && <Legend />}
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
  
  const renderChart = () => {
    switch (type) {
      case 'area':
        return renderAreaChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      default:
        return renderAreaChart();
    }
  };
  
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Badge variant={isConnected ? "success" : "gray"}>
          {isConnected ? "Live Data" : "Offline"}
        </Badge>
      </div>
      {renderChart()}
    </Card>
  );
}