import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { ResultsChart } from '../charts/ResultsChart';
import { ScanResultsOverview } from '../charts/ScanResultsOverview';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchResults, updateStatistics } from '../../store/slices/resultsSlice';

export function ScanResultsReport() {
  const dispatch = useAppDispatch();
  const { files, loading, statistics } = useAppSelector(state => state.results);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [vpnTypeFilter, setVpnTypeFilter] = useState<string>('all');
  
  useEffect(() => {
    dispatch(fetchResults());
  }, [dispatch]);
  
  useEffect(() => {
    if (files.length > 0) {
      dispatch(updateStatistics());
    }
  }, [files, dispatch]);
  
  const handleExportReport = () => {
    // Создаем отчет в формате CSV
    const headers = ['VPN Type', 'Valid', 'Invalid', 'Errors', 'Success Rate'];
    const rows = Object.entries(statistics.vpnTypeStats).map(([type, stats]) => [
      type,
      stats.valid,
      stats.invalid,
      stats.errors,
      `${stats.successRate.toFixed(2)}%`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Создаем и скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scan-results-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scan Results Report</h1>
          <p className="text-gray-600 mt-1">Comprehensive analysis of scanning results</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => dispatch(fetchResults())}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Credentials</p>
              <p className="text-3xl font-bold text-success-600">{statistics.totalValid.toLocaleString()}</p>
              <p className="text-sm text-success-600 mt-1">
                {statistics.successRate.toFixed(1)}% success rate
              </p>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <FileText className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Invalid Attempts</p>
              <p className="text-3xl font-bold text-error-600">{statistics.totalInvalid.toLocaleString()}</p>
              <p className="text-sm text-error-600 mt-1">
                {(100 - statistics.successRate).toFixed(1)}% of total
              </p>
            </div>
            <div className="p-3 bg-error-100 rounded-full">
              <FileText className="h-8 w-8 text-error-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Logs</p>
              <p className="text-3xl font-bold text-warning-600">{statistics.totalErrors.toLocaleString()}</p>
              <p className="text-sm text-warning-600 mt-1">
                Across all servers
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-full">
              <FileText className="h-8 w-8 text-warning-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Result Files</p>
              <p className="text-3xl font-bold text-primary-600">{files.length}</p>
              <p className="text-sm text-primary-600 mt-1">
                From {Object.keys(statistics.serverStats).length} servers
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <BarChart3 className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={vpnTypeFilter}
                onChange={(e) => setVpnTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All VPN Types</option>
                {Object.keys(statistics.vpnTypeStats).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {files.length} files analyzed
            </span>
            <Badge variant="success">
              {statistics.totalValid.toLocaleString()} valid credentials
            </Badge>
          </div>
        </div>
      </Card>

      {/* Time Series Chart */}
      <ResultsChart type="area" title="Credentials Found Over Time" height={350} />

      {/* VPN Type and Error Distribution */}
      <ScanResultsOverview />

      {/* Server Performance */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Server Performance Comparison</h3>
          <Badge variant="primary">Analysis</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Found</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(statistics.serverStats).map(([server, stats]) => (
                <tr key={server}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{server}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.valid.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900 mr-2">{stats.successRate.toFixed(1)}%</span>
                      <ProgressBar 
                        value={stats.successRate} 
                        color={stats.successRate > 10 ? 'success' : 'warning'} 
                        size="sm" 
                        className="w-24"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.errors.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stats.valid > 1000 ? (
                      <Badge variant="success">Excellent</Badge>
                    ) : stats.valid > 500 ? (
                      <Badge variant="primary">Good</Badge>
                    ) : stats.valid > 100 ? (
                      <Badge variant="warning">Average</Badge>
                    ) : (
                      <Badge variant="error">Poor</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis & Recommendations</h3>
        <div className="space-y-4">
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <h4 className="font-medium text-primary-800 mb-2">Performance Insights</h4>
            <p className="text-sm text-primary-700">
              Based on the collected data, the most effective VPN type for scanning is 
              <span className="font-semibold"> {Object.entries(statistics.vpnTypeStats)
                .sort((a, b) => b[1].successRate - a[1].successRate)[0]?.[0] || 'Fortinet'}</span> with 
              a success rate of {Object.entries(statistics.vpnTypeStats)
                .sort((a, b) => b[1].successRate - a[1].successRate)[0]?.[1].successRate.toFixed(1) || '0'}%.
            </p>
          </div>
          
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
            <h4 className="font-medium text-success-800 mb-2">Server Optimization</h4>
            <p className="text-sm text-success-700">
              The best performing server is <span className="font-semibold">{Object.entries(statistics.serverStats)
                .sort((a, b) => b[1].valid - a[1].valid)[0]?.[0] || '192.0.2.10'}</span>. 
              Consider replicating its configuration to other servers to improve overall performance.
            </p>
          </div>
          
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <h4 className="font-medium text-warning-800 mb-2">Error Reduction</h4>
            <p className="text-sm text-warning-700">
              The most common error type is <span className="font-semibold">Timeout</span>. 
              Consider increasing the timeout value or implementing a more aggressive retry strategy.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}