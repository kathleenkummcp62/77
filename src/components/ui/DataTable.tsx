import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Pagination } from './Pagination';
import { Search, Filter, RefreshCw, Download, Trash2 } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  title?: string;
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectRow?: (row: T) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  bulkActions?: React.ReactNode;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  title,
  loading = false,
  pagination,
  search,
  filters,
  actions,
  onRefresh,
  onExport,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  onClearSelection,
  bulkActions,
  emptyState,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Sort data if sortColumn is set
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn as keyof T];
      const bValue = b[sortColumn as keyof T];
      
      if (aValue === bValue) return 0;
      
      const result = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [data, sortColumn, sortDirection]);
  
  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Check if a row is selected
  const isSelected = (row: T) => {
    return selectedRows.some(selectedRow => selectedRow[keyField] === row[keyField]);
  };
  
  // Check if all rows are selected
  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  
  // Default empty state
  const defaultEmptyState = (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
      <p className="mt-1 text-sm text-gray-500">
        No data available to display.
      </p>
    </div>
  );
  
  return (
    <Card>
      {/* Header */}
      {(title || search || filters || actions || onRefresh || onExport) && (
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
              {search && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search.onSearch()}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              
              {filters && (
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  {filters}
                </div>
              )}
              
              {onRefresh && (
                <Button variant="ghost" onClick={onRefresh} loading={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
              
              {onExport && (
                <Button variant="ghost" onClick={onExport} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              
              {actions}
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions */}
      {selectable && selectedRows.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              {bulkActions}
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && onSelectRow && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && sortColumn === column.key && (
                      <span>
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600"></div>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-4"
                >
                  {emptyState || defaultEmptyState}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className={`hover:bg-gray-50 ${isSelected(row) ? 'bg-primary-50' : ''}`}
                >
                  {selectable && onSelectRow && (
                    <td className="px-6 py-4 whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={isSelected(row)}
                        onChange={() => onSelectRow(row)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? column.render(row) : String(row[column.key as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        </div>
      )}
    </Card>
  );
}