import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAppSelector } from '../../store';

export function ScanResultsOverview() {
  const { statistics } = useAppSelector(state => state.results);
  
  // Данные для графика по типам VPN
  const vpnTypeData = Object.entries(statistics.vpnTypeStats).map(([type, stats]) => ({
    name: type,
    valid: stats.valid,
    invalid: stats.invalid,
    successRate: stats.successRate,
  }));
  
  // Данные для графика распределения ошибок
  const errorDistribution = [
    { name: 'Timeout', value: 45 },
    { name: 'Connection', value: 25 },
    { name: 'Auth Failed', value: 15 },
    { name: 'Rate Limited', value: 10 },
    { name: 'Other', value: 5 },
  ];
  
  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Success Rate by VPN Type</h3>
          <Badge variant="primary">Analysis</Badge>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vpnTypeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'successRate') return [`${value.toFixed(1)}%`, 'Success Rate'];
                return [value, name === 'valid' ? 'Valid' : 'Invalid'];
              }}
            />
            <Legend />
            <Bar dataKey="valid" fill="#22c55e" name="Valid" />
            <Bar dataKey="invalid" fill="#ef4444" name="Invalid" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Error Distribution</h3>
          <Badge variant="warning">Analysis</Badge>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={errorDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {errorDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} errors`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}