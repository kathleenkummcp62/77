import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { Upload, X, File, CheckCircle, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string;
  multiple?: boolean;
  className?: string;
  label?: string;
  description?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  multiple = true,
  className = '',
  label = 'Upload Files',
  description = 'Drag and drop files here or click to browse',
  value,
  onChange
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>(value || []);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    processFiles(Array.from(selectedFiles));
    
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = (newFiles: File[]) => {
    // Validate files
    const validFiles: File[] = [];
    const newErrors: string[] = [];
    
    for (const file of newFiles) {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(`File "${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}`);
        continue;
      }
      
      // Check file type if accept is specified
      if (accept !== '*') {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type || '';
        const fileExtension = `.${file.name.split('.').pop()}`;
        
        if (!acceptedTypes.some(type => 
          type === fileType || 
          type === fileExtension || 
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/')))
        )) {
          newErrors.push(`File "${file.name}" has an unsupported format`);
          continue;
        }
      }
      
      validFiles.push(file);
    }
    
    // Check max files
    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`You can upload a maximum of ${maxFiles} files`);
      validFiles.splice(maxFiles - files.length);
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
    }
    
    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesSelected(validFiles);
      
      if (onChange) {
        onChange(updatedFiles);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    
    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const handleClearErrors = () => {
    setErrors([]);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />
        
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">{description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {multiple ? `Up to ${maxFiles} files` : 'Single file'}, max {formatFileSize(maxSize)} each
        </p>
      </div>
      
      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-gray-700">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </div>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-error-600" />
              <span className="text-sm font-medium text-error-800">Upload Errors</span>
            </div>
            <button
              type="button"
              onClick={handleClearErrors}
              className="text-error-600 hover:text-error-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="text-sm text-error-700 space-y-1 ml-6 list-disc">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}