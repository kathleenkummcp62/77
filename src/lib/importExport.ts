import { saveAs } from 'file-saver';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

/**
 * Detect delimiter in a text string
 */
export function detectDelimiter(content: string): ';' | ':' | ',' | '\t' {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return ';';
  
  const firstLine = lines[0];
  
  const counts = {
    ';': (firstLine.match(/;/g) || []).length,
    ':': (firstLine.match(/:/g) || []).length,
    ',': (firstLine.match(/,/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length
  };
  
  const maxDelimiter = Object.entries(counts)
    .reduce((max, [delimiter, count]) => count > max[1] ? [delimiter, count] : max, ['', 0]);
  
  return maxDelimiter[0] as ';' | ':' | ',' | '\t';
}

/**
 * Parse credentials from text content
 */
export function parseCredentials(content: string, delimiter: string = 'auto'): any[] {
  if (!content.trim()) {
    return [];
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  
  // Detect delimiter if set to auto
  const actualDelimiter = delimiter === 'auto' ? detectDelimiter(content) : delimiter;
  
  return lines.map(line => {
    const parts = line.split(actualDelimiter);
    
    // Handle special formats
    if (line.includes(':Firebox-DB:') || (parts.length >= 5 && parts[2] === 'Firebox-DB')) {
      // WatchGuard format: https://ip:port:Firebox-DB:domain:user:pass
      return {
        url: `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}`,
        username: parts[4] || '',
        password: parts[5] || '',
        vpnType: 'watchguard'
      };
    } else if (parts.length >= 4 && parts[0].includes('://') && !parts[0].includes(';')) {
      // Cisco format: https://ip:port:user:pass:group
      return {
        url: `${parts[0]}:${parts[1]}`,
        username: parts[2] || '',
        password: parts[3] || '',
        domain: parts[4] || '',
        vpnType: 'cisco'
      };
    } else {
      // Standard format: URL;Username;Password;Domain
      return {
        url: parts[0] || '',
        username: parts[1] || '',
        password: parts[2] || '',
        domain: parts[3] || '',
        vpnType: guessVPNType(parts[0] || '')
      };
    }
  });
}

/**
 * Parse worker servers from text content
 */
export function parseWorkers(content: string, delimiter: string = 'auto'): any[] {
  if (!content.trim()) {
    return [];
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  
  // Detect delimiter if set to auto
  const actualDelimiter = delimiter === 'auto' ? detectDelimiter(content) : delimiter;
  
  return lines.map(line => {
    const parts = line.split(actualDelimiter);
    
    return {
      ip: parts[0]?.trim() || '',
      port: parts.length > 1 ? parseInt(parts[1]?.trim()) || 22 : 22,
      username: parts.length > 2 ? parts[2]?.trim() || 'root' : 'root',
      password: parts.length > 3 ? parts[3]?.trim() || '' : '',
      status: 'unknown'
    };
  });
}

/**
 * Guess VPN type from URL
 */
export function guessVPNType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('fortinet') || lowerUrl.includes('fortigate')) return 'fortinet';
  if (lowerUrl.includes('paloalto') || lowerUrl.includes('globalprotect')) return 'paloalto';
  if (lowerUrl.includes('sonicwall')) return 'sonicwall';
  if (lowerUrl.includes('sophos')) return 'sophos';
  if (lowerUrl.includes('watchguard')) return 'watchguard';
  if (lowerUrl.includes('cisco') || lowerUrl.includes('asa')) return 'cisco';
  return 'unknown';
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: any[], filename: string, columns?: { key: string; header: string }[]): void {
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
}

/**
 * Export data to Excel
 */
export function exportToExcel(data: any[], filename: string, columns?: { key: string; header: string }[]): void {
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
}

/**
 * Export data to PDF
 */
export function exportToPDF(data: any[], filename: string, title: string, columns?: { key: string; header: string }[]): void {
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
}

/**
 * Export data to JSON
 */
export function exportToJSON(data: any[], filename: string, columns?: { key: string; header: string }[]): void {
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
}

/**
 * Export data to TXT
 */
export function exportToTXT(data: any[], filename: string, columns?: { key: string; header: string }[]): void {
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
}

/**
 * Export data in specified format
 */
export function exportData(
  data: any[], 
  format: 'csv' | 'excel' | 'pdf' | 'json' | 'txt', 
  filename: string, 
  title: string = 'Export Data',
  columns?: { key: string; header: string }[]
): void {
  try {
    switch (format) {
      case 'csv':
        exportToCSV(data, filename, columns);
        break;
      case 'excel':
        exportToExcel(data, filename, columns);
        break;
      case 'pdf':
        exportToPDF(data, filename, title, columns);
        break;
      case 'json':
        exportToJSON(data, filename, columns);
        break;
      case 'txt':
        exportToTXT(data, filename, columns);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    toast.success(`Data exported as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Export error:', error);
    toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}