import { authFetch, getAuthToken } from './auth';
import toast from 'react-hot-toast';

// Base API URL
const API_BASE_URL = '/api';

// Error handling wrapper for fetch
async function fetchWithErrorHandling(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await authFetch(url, options);
    
    if (!response.ok) {
      // Try to parse error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      } catch (e) {
        throw new Error(`HTTP error ${response.status}`);
      }
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`API error (${url}):`, error);
    
    // Show toast notification for user-facing errors
    if (error.message !== 'Authentication required') {
      toast.error(`API Error: ${error.message}`);
    }
    
    throw error;
  }
}

// Generic API request function with validation
export async function apiRequest<T>(
  endpoint: string, 
  method: string = 'GET', 
  data?: any, 
  validateData?: (data: any) => boolean
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetchWithErrorHandling(url, options);
  
  // Validate response data if validator provided
  if (validateData && !validateData(response.data)) {
    throw new Error('Invalid response data');
  }
  
  return response.data;
}

// API endpoints
export const api = {
  // Stats
  getStats: () => apiRequest('/stats'),
  
  // Servers
  getServers: () => apiRequest('/servers'),
  
  // Credentials
  getCredentials: () => apiRequest('/credentials'),
  createCredential: (data: any) => apiRequest('/credentials', 'POST', data),
  updateCredential: (id: number, data: any) => apiRequest(`/credentials/${id}`, 'PUT', data),
  deleteCredential: (id: number) => apiRequest(`/credentials/${id}`, 'DELETE'),
  
  // Proxies
  getProxies: () => apiRequest('/proxies'),
  createProxy: (data: any) => apiRequest('/proxies', 'POST', data),
  updateProxy: (id: number, data: any) => apiRequest(`/proxies/${id}`, 'PUT', data),
  deleteProxy: (id: number) => apiRequest(`/proxies/${id}`, 'DELETE'),
  
  // Tasks
  getTasks: () => apiRequest('/tasks'),
  createTask: (data: any) => apiRequest('/tasks', 'POST', data),
  updateTask: (id: number, data: any) => apiRequest(`/tasks/${id}`, 'PUT', data),
  deleteTask: (id: number) => apiRequest(`/tasks/${id}`, 'DELETE'),
  
  // Scanner control
  startScanner: (vpnType: string) => apiRequest('/start', 'POST', { vpn_type: vpnType }),
  stopScanner: (vpnType: string) => apiRequest('/stop', 'POST', { vpn_type: vpnType }),
  
  // Logs
  getLogs: (limit: number = 100) => apiRequest(`/logs?limit=${limit}`),
  
  // Health check
  healthCheck: () => apiRequest('/health'),
};

// Utility function to handle API errors in components
export function handleApiError(error: any, fallbackMessage: string = 'An error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

// Validate API response
export function validateApiResponse(response: any): boolean {
  return response && response.success === true;
}