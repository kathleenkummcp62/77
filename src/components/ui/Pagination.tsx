import React from 'react';
import { Button } from './Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: PaginationProps) {
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show before and after current page
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push(-1); // -1 represents ellipsis
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push(-2); // -2 represents ellipsis
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const visiblePages = getVisiblePages();
  
  return (
    <div className={`flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 ${className}`}>
      <div className="flex items-center space-x-2">
        {totalItems !== undefined && (
          <span className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        {/* First page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* Previous page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Page numbers */}
        {visiblePages.map((page, index) => {
          if (page < 0) {
            // Render ellipsis
            return (
              <span key={`ellipsis-${index}`} className="px-2 py-1">
                ...
              </span>
            );
          }
          
          return (
            <Button
              key={page}
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[2rem]"
            >
              {page}
            </Button>
          );
        })}
        
        {/* Next page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Last page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}