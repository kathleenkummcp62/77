import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Download, FileText, FileSpreadsheet, File as FilePdf, X, Check } from 'lucide-react';
import { saveAs } from 'file-saver';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppSelector } from '../../store';
import toast from 'react-hot-toast';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  title: string;
}

export function ExportReportModal({ isOpen, onClose, data, title }: ExportReportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');
  const [loading, setLoading] = useState(false);
  const { statistics } = useAppSelector(state => state.results);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setLoading(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

      switch (format) {
        case 'csv':
          exportCSV(data, filename);
          break;
        case 'excel':
          exportExcel(data, filename);
          break;
        case 'pdf':
          exportPDF(data, filename, title);
          break;
        case 'json':
          exportJSON(data, filename);
          break;
      }

      toast.success(`Report exported as ${format.toUpperCase()}`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (data: any[], filename: string) => {
    // Convert data to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  const exportExcel = (data: any[], filename: string) => {
    // Create workbook and worksheet
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Report');
    
    // Add summary sheet with statistics
    const summaryData = [
      { Metric: 'Total Valid Credentials', Value: statistics.totalValid },
      { Metric: 'Total Invalid Attempts', Value: statistics.totalInvalid },
      { Metric: 'Total Errors', Value: statistics.totalErrors },
      { Metric: 'Success Rate', Value: `${statistics.successRate.toFixed(2)}%` },
    ];
    
    const summaryWs = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(wb, summaryWs, 'Summary');
    
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
    
    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Valid Credentials', statistics.totalValid.toString()],
        ['Total Invalid Attempts', statistics.totalInvalid.toString()],
        ['Total Errors', statistics.totalErrors.toString()],
        ['Success Rate', `${statistics.successRate.toFixed(2)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Add main data table
    const columns = Object.keys(data[0]).map(key => ({ header: key, dataKey: key }));
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [columns.map(col => col.header)],
      body: data.map(row => columns.map(col => row[col.dataKey])),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Save PDF
    doc.save(`${filename}.pdf`);
  };

  const exportJSON = (data: any[], filename: string) => {
    // Add statistics to JSON export
    const jsonData = {
      report: {
        title,
        generatedAt: new Date().toISOString(),
        statistics: {
          totalValid: statistics.totalValid,
          totalInvalid: statistics.totalInvalid,
          totalErrors: statistics.totalErrors,
          successRate: statistics.successRate,
        },
        data
      }
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-600">
            Select a format to export the {title} report containing {data.length} records.
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