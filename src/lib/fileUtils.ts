import toast from 'react-hot-toast';

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate total size of files
 */
export function calculateTotalSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Check if file type is allowed
 */
export function isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  return allowedTypes.includes(fileExtension);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
}): boolean {
  const { maxSize, allowedTypes } = options;
  
  // Check file size
  if (maxSize && file.size > maxSize) {
    toast.error(`File too large: ${file.name} (${formatFileSize(file.size)}). Maximum size: ${formatFileSize(maxSize)}`);
    return false;
  }
  
  // Check file type
  if (allowedTypes && !isFileTypeAllowed(file, allowedTypes)) {
    toast.error(`File type not allowed: ${file.name}. Allowed types: ${allowedTypes.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Handle file drop event
 */
export function handleFileDrop(
  event: React.DragEvent<HTMLDivElement>,
  onFiles: (files: File[]) => void,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
  }
): void {
  event.preventDefault();
  event.stopPropagation();
  
  const { maxSize, allowedTypes, maxFiles } = options || {};
  
  // Get dropped files
  const droppedFiles = Array.from(event.dataTransfer.files);
  
  // Check number of files
  if (maxFiles && droppedFiles.length > maxFiles) {
    toast.error(`Too many files. Maximum: ${maxFiles}`);
    return;
  }
  
  // Validate files
  const validFiles = droppedFiles.filter(file => 
    !options || validateFile(file, { maxSize, allowedTypes })
  );
  
  if (validFiles.length > 0) {
    onFiles(validFiles);
  }
}

/**
 * Create download URL for file
 */
export function createDownloadUrl(content: string, type: string = 'text/plain'): string {
  const blob = new Blob([content], { type });
  return URL.createObjectURL(blob);
}

/**
 * Download content as file
 */
export function downloadAsFile(content: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
    return false;
  }
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string, delimiter: string = ','): any[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    
    return obj;
  });
}