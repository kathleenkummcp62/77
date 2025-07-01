import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { registerUser, setAuthData, validateToken } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Lock, User, AlertTriangle, Key, UserPlus, Shield } from 'lucide-react';
import { useAppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | 'viewer'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate token
    if (!validateToken(token)) {
      setError('Invalid authentication token');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await registerUser({
        username,
        password,
        role,
        token
      });
      
      if (!result) {
        setError('Registration failed. Username may already exist.');
        setLoading(false);
        return;
      }
      
      const { token: authToken, user } = result;
      
      // Store authentication data
      setAuthData(authToken, user);
      
      // Update Redux state
      dispatch(setUser(user));
      
      toast.success(`Account created successfully! Welcome, ${user.username}!`);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-1">Register for dashboard access</p>
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
              placeholder="Choose a username"
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
              placeholder="Create a password"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              placeholder="Confirm your password"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Shield className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user' | 'viewer')}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              required
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        
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
              required
            />
          </div>
        </div>
        
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={loading}
        >
          Create Account
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account? <button 
            onClick={() => window.location.href = '/login'} 
            className="text-primary-600 hover:text-primary-500"
          >
            Sign in
          </button>
        </p>
      </div>
    </Card>
  );
}