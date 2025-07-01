import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { login, setAuthData } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Lock, User, AlertTriangle } from 'lucide-react';
import { useAppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await login({ username, password });
      
      if (!result) {
        setError('Invalid username or password');
        return;
      }
      
      const { token, user } = result;
      
      // Store authentication data
      setAuthData(token, user);
      
      // Update Redux state
      dispatch(setUser(user));
      
      toast.success(`Welcome, ${user.username}!`);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
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
        
        <div>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            Sign In
          </Button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Default credentials:</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="p-2 bg-gray-50 rounded border border-gray-200">
            <p className="font-medium">admin</p>
            <p className="text-xs text-gray-500">admin</p>
          </div>
          <div className="p-2 bg-gray-50 rounded border border-gray-200">
            <p className="font-medium">user</p>
            <p className="text-xs text-gray-500">user123</p>
          </div>
          <div className="p-2 bg-gray-50 rounded border border-gray-200">
            <p className="font-medium">viewer</p>
            <p className="text-xs text-gray-500">viewer123</p>
          </div>
        </div>
      </div>
    </Card>
  );
}