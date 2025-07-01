import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Upload, 
  FileText, 
  X, 
  Check,
  AlertTriangle,
  Copy,
  Save,
  Server,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
  type: 'urls' | 'credentials' | 'workers' | 'vpn-types';
  title?: string;
}

export function DataImportModal({ 
  isOpen, 
  onClose, 
  onImport, 
  type,
  title = 'Import Data'
}: DataImportModalProps) {
  const [importMethod, setImportMethod] = useState<'file' | 'paste' | 'manual'>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [manualEntries, setManualEntries] = useState<string[]>(['']);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [delimiter, setDelimiter] = useState<';' | ':' | ',' | 'tab' | 'auto'>('auto');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      parseData(content);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteContent(e.target.value);
    if (e.target.value) {
      parseData(e.target.value);
    } else {
      setParsedData(null);
      setParseError(null);
    }
  };

  const handleManualEntryChange = (index: number, value: string) => {
    const newEntries = [...manualEntries];
    newEntries[index] = value;
    setManualEntries(newEntries);
    
    // Add a new empty entry if the last entry is not empty
    if (index === newEntries.length - 1 && value) {
      newEntries.push('');
      setManualEntries(newEntries);
    }
    
    // Parse manual entries
    if (newEntries.filter(Boolean).length > 0) {
      parseData(newEntries.filter(Boolean).join('\n'));
    } else {
      setParsedData(null);
      setParseError(null);
    }
  };

  const detectDelimiter = (content: string): ';' | ':' | ',' | 'tab' => {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return ';';
    
    const firstLine = lines[0];
    
    const counts = {
      ';': (firstLine.match(/;/g) || []).length,
      ':': (firstLine.match(/:/g) || []).length,
      ',': (firstLine.match(/,/g) || []).length,
      'tab': (firstLine.match(/\t/g) || []).length
    };
    
    const maxDelimiter = Object.entries(counts)
      .reduce((max, [delimiter, count]) => count > max[1] ? [delimiter, count] : max, ['', 0]);
    
    return maxDelimiter[0] as ';' | ':' | ',' | 'tab';
  };

  const parseData = (content: string) => {
    if (!content.trim()) {
      setParsedData(null);
      setParseError(null);
      return;
    }
    
    try {
      const lines = content.split(/\r?\n/).filter(Boolean);
      
      // Detect delimiter if set to auto
      const actualDelimiter = delimiter === 'auto' ? detectDelimiter(content) : delimiter;
      const delimiterChar = actualDelimiter === 'tab' ? '\t' : actualDelimiter;
      
      const parsed = lines.map(line => {
        const parts = line.split(delimiterChar);
        
        switch (type) {
          case 'urls':
            return { url: parts[0]?.trim() };
          
          case 'credentials':
            if (parts.length < 2) {
              throw new Error(`Line "${line}" does not have enough parts (expected at least 2)`);
            }
            return {
              url: parts[0]?.trim(),
              username: parts[1]?.trim(),
              password: parts[2]?.trim(),
              domain: parts[3]?.trim()
            };
          
          case 'workers':
            if (parts.length < 3) {
              throw new Error(`Line "${line}" does not have enough parts (expected at least 3)`);
            }
            return {
              ip: parts[0]?.trim(),
              port: parts.length > 1 ? parseInt(parts[1]?.trim()) || 22 : 22,
              username: parts.length > 2 ? parts[2]?.trim() : 'root',
              password: parts.length > 3 ? parts[3]?.trim() : ''
            };
          
          case 'vpn-types':
            return {
              id: parts[0]?.trim(),
              name: parts.length > 1 ? parts[1]?.trim() : parts[0]?.trim(),
              description: parts.length > 2 ? parts[2]?.trim() : ''
            };
          
          default:
            return parts;
        }
      });
      
      setParsedData(parsed);
      setParseError(null);
    } catch (error) {
      console.error('Parse error:', error);
      setParsedData(null);
      setParseError(error instanceof Error ? error.message : 'Failed to parse data');
    }
  };

  const handleImport = () => {
    if (!parsedData) {
      toast.error('No valid data to import');
      return;
    }
    
    setLoading(true);
    
    try {
      onImport(parsedData);
      toast.success(`Successfully imported ${parsedData.length} items`);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch (type) {
      case 'urls':
        return 'https://vpn.example.com\nhttps://vpn2.example.com';
      
      case 'credentials':
        return 'https://vpn.example.com;admin;password123\nhttps://vpn2.example.com;user;pass456;domain';
      
      case 'workers':
        return '192.168.1.100;22;root;password123\n10.0.0.50;22;admin;secret';
      
      case 'vpn-types':
        return 'fortinet;Fortinet VPN;FortiGate SSL VPN\npaloalto;PaloAlto GlobalProtect;PaloAlto Networks VPN';
      
      default:
        return '';
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'urls': return 'Import VPN URLs';
      case 'credentials': return 'Import VPN Credentials';
      case 'workers': return 'Import Worker Servers';
      case 'vpn-types': return 'Import VPN Types';
      default: return 'Import Data';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'urls': return FileText;
      case 'credentials': return Shield;
      case 'workers': return Server;
      case 'vpn-types': return Shield;
      default: return FileText;
    }
  };

  const TypeIcon = getIcon();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TypeIcon className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Import Method Selection */}
        <div className="mb-6">
          <div className="flex space-x-2 mb-4">
            <Button 
              variant={importMethod === 'file' ? 'primary' : 'ghost'} 
              onClick={() => setImportMethod('file')}
            >
              <Upload className="h-4 w-4 mr-2" />
              File Upload
            </Button>
            <Button 
              variant={importMethod === 'paste' ? 'primary' : 'ghost'} 
              onClick={() => setImportMethod('paste')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy & Paste
            </Button>
            <Button 
              variant={importMethod === 'manual' ? 'primary' : 'ghost'} 
              onClick={() => setImportMethod('manual')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual Entry
            </Button>
          </div>
          
          {/* Delimiter Selection */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-gray-600">Delimiter:</span>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as any)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="auto">Auto-detect</option>
              <option value=";">Semicolon (;)</option>
              <option value=":">Colon (:)</option>
              <option value=",">Comma (,)</option>
              <option value="tab">Tab</option>
            </select>
          </div>
          
          {/* File Upload */}
          {importMethod === 'file' && (
            <div>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {fileName ? fileName : 'Click to upload or drag and drop'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {type === 'urls' ? 'TXT, CSV files with URL list' : 
                   type === 'credentials' ? 'TXT, CSV files with credentials' :
                   type === 'workers' ? 'TXT, CSV files with worker servers' :
                   'TXT, CSV files'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.csv"
                  onChange={handleFileSelect}
                />
                {fileContent && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">File Preview</span>
                      <Badge variant="success">
                        {parsedData?.length || 0} items
                      </Badge>
                    </div>
                    <pre className="text-xs text-gray-600 max-h-40 overflow-y-auto">
                      {fileContent.slice(0, 500)}
                      {fileContent.length > 500 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Copy & Paste */}
          {importMethod === 'paste' && (
            <div>
              <textarea
                value={pasteContent}
                onChange={handlePasteChange}
                placeholder={getPlaceholderText()}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              />
              {parsedData && (
                <div className="mt-2 text-sm text-gray-600">
                  <Badge variant="success">
                    {parsedData.length} items parsed
                  </Badge>
                </div>
              )}
            </div>
          )}
          
          {/* Manual Entry */}
          {importMethod === 'manual' && (
            <div className="space-y-2">
              {manualEntries.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={entry}
                    onChange={(e) => handleManualEntryChange(index, e.target.value)}
                    placeholder={getPlaceholderText().split('\n')[0]}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {index > 0 && entry === '' && index === manualEntries.length - 2 && (
                    <button
                      onClick={() => setManualEntries(manualEntries.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              {parsedData && (
                <div className="mt-2 text-sm text-gray-600">
                  <Badge variant="success">
                    {parsedData.length} items entered
                  </Badge>
                </div>
              )}
            </div>
          )}
          
          {/* Parse Error */}
          {parseError && (
            <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-error-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-error-800">Parse Error</h4>
                  <p className="text-sm text-error-600">{parseError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Preview */}
        {parsedData && parsedData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(parsedData[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        {Object.values(item).map((value, i) => (
                          <td
                            key={i}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {value === undefined || value === null ? '' : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                  Showing 5 of {parsedData.length} items
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleImport}
            disabled={!parsedData || parsedData.length === 0 || loading}
            loading={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Import {parsedData ? parsedData.length : 0} Items
          </Button>
        </div>
      </Card>
    </div>
  );
}