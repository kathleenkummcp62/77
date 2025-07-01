import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Download, FileText, FileSpreadsheet, File as FilePdf, X, Check } from 'lucide-react';
import { saveAs } from 'file-saver';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  title: string;
  filename?: string;
  columns?: { key: string; header: string }[];
}

export function DataExportModal({ 
  isOpen, 
  onClose, 
  data, 
  title, 
  filename,
  columns
}: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf' | 'json' | 'txt'>('csv');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getDefaultFilename = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
    return baseFilename;
  };

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setLoading(true);
    try {
      const baseFilename = getDefaultFilename();

      switch (format) {
        case 'csv':
          exportCSV(data, baseFilename);
          break;
        case 'excel':
          exportExcel(data, baseFilename);
          break;
        case 'pdf':
          exportPDF(data, baseFilename, title);
          break;
        case 'json':
          exportJSON(data, baseFilename);
          break;
        case 'txt':
          exportTXT(data, baseFilename);
          break;
      }

      toast.success(`Data exported as ${format.toUpperCase()}`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (data: any[], filename: string) => {
    // Get column headers
    const headers = columns 
      ? columns.map(col => col.header) 
      : Object.keys(data[0]);
    
    // Get data rows
    const rows = data.map(row => 
      (columns ? columns.map(col => row[col.key]) : Object.values(row))
        .map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
    );
    
    // Create CSV content
    const csv = [headers.join(','), ...rows].join('\n');
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  const exportExcel = (data: any[], filename: string) => {
    // Prepare data for Excel
    const excelData = data.map(item => {
      if (columns) {
        const row: Record<string, any> = {};
        columns.forEach(col => {
          row[col.header] = item[col.key];
        });
        return row;
      }
      return item;
    });
    
    // Create workbook and worksheet
    const ws = utils.json_to_sheet(excelData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate Excel file
    writeFile(wb, `${filename}.xlsx`);
  };

  const exportPDF = (data: any[], filename: string, title: string) => {
    // Create PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    // Prepare table data
    const tableColumns = columns 
      ? columns.map(col => ({ header: col.header, dataKey: col.key }))
      : Object.keys(data[0]).map(key => ({ header: key, dataKey: key }));
    
    const tableRows = data.map(row => 
      tableColumns.map(col => String(row[col.dataKey] || ''))
    );
    
    // Add table
    autoTable(doc, {
      startY: 40,
      head: [tableColumns.map(col => col.header)],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Save PDF
    doc.save(`${filename}.pdf`);
  };

  const exportJSON = (data: any[], filename: string) => {
    // Prepare data for JSON export
    const jsonData = data.map(item => {
      if (columns) {
        const row: Record<string, any> = {};
        columns.forEach(col => {
          row[col.key] = item[col.key];
        });
        return row;
      }
      return item;
    });
    
    // Create and download file
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  };

  const exportTXT = (data: any[], filename: string) => {
    // Prepare data for TXT export
    const lines = data.map(item => {
      if (columns) {
        return columns.map(col => `${col.header}: ${item[col.key]}`).join('\n') + '\n---';
      }
      return Object.entries(item).map(([key, value]) => `${key}: ${value}`).join('\n') + '\n---';
    });
    
    // Create and download file
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    saveAs(blob, `${filename}.txt`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Export {title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-600">
            Select a format to export {data.length} {data.length === 1 ? 'record' : 'records'}.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center ${
                format === 'csv' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormat('csv')}
            >
              <FileText className="h-8 w-8 text-primary-600 mb-2" />
              <span className="font-medium">CSV</span>
              <span className="text-xs text-gray-500">Comma Separated</span>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center ${
                format === 'excel' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormat('excel')}
            >
              <FileSpreadsheet className="h-8 w-8 text-success-600 mb-2" />
              <span className="font-medium">Excel</span>
              <span className="text-xs text-gray-500">XLSX Spreadsheet</span>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center ${
                format === 'pdf' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormat('pdf')}
            >
              <FilePdf className="h-8 w-8 text-error-600 mb-2" />
              <span className="font-medium">PDF</span>
              <span className="text-xs text-gray-500">Portable Document</span>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center ${
                format === 'json' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormat('json')}
            >
              <FileText className="h-8 w-8 text-warning-600 mb-2" />
              <span className="font-medium">JSON</span>
              <span className="text-xs text-gray-500">Structured Data</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExport}
            loading={loading}
          >
            {loading ? 'Exporting...' : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export as {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}