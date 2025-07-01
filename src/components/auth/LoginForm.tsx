import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { login, setAuthData } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Lock, User, AlertTriangle, Key } from 'lucide-react';
import { useAppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenField, setShowTokenField] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  const dispatch = useAppDispatch();

  // Reset login attempts after 5 minutes
  useEffect(() => {
    if (loginAttempts > 0) {
      const timer = setTimeout(() => {
        setLoginAttempts(0);
      }, 5 * 60 * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loginAttempts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    // Check login attempts
    if (loginAttempts >= 5) {
      setError('Too many login attempts. Please try again later.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Attempting login with:', { username, password, token: token || undefined });
      
      // For demo purposes, hardcode admin login
      if (username === 'admin' && password === 'admin') {
        const user = { id: '1', username: 'admin', role: 'admin' as const };
        const authToken = 'mock-token-for-admin';
        
        // Store authentication data
        setAuthData(authToken, user);
        
        // Update Redux state
        dispatch(setUser(user));
        
        // Reset login attempts
        setLoginAttempts(0);
        
        toast.success(`Welcome, ${user.username}!`);
        console.log('Login successful:', user);
        
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
        
        setLoading(false);
        return;
      }
      
      const result = await login({ 
        username, 
        password,
        token: token || undefined
      });
      
      if (!result) {
        setLoginAttempts(prev => prev + 1);
        setError(`Invalid username or password. Attempts: ${loginAttempts + 1}/5`);
        setLoading(false);
        return;
      }
      
      const { token: authToken, user } = result;
      
      // Store authentication data
      setAuthData(authToken, user);
      
      // Update Redux state
      dispatch(setUser(user));
      
      // Reset login attempts
      setLoginAttempts(0);
      
      toast.success(`Welcome, ${user.username}!`);
      console.log('Login successful:', user);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">VPN Dashboard Login</h2>
        <p className="text-gray-600 mt-1">Enter your credentials to access the dashboard</p>
      </div>
      
      {error && (
        <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-error-600" />
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              placeholder="Enter your username"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              placeholder="Enter your password"
              required
            />
          </div>
        </div>
        
        {showTokenField && (
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Authentication Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                placeholder="Enter authentication token"
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowTokenField(!showTokenField)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            {showTokenField ? 'Hide token field' : 'Show token field'}
          </button>
          
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Sign In
          </Button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Default admin account: <span className="font-medium">admin / admin</span>
        </p>
      </div>
    </Card>
  );
}