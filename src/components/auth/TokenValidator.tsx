import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { validateToken } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Key, CheckCircle, XCircle } from 'lucide-react';

interface TokenValidatorProps {
  onValidToken?: () => void;
}

export function TokenValidator({ onValidToken }: TokenValidatorProps) {
  const [token, setToken] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = () => {
    if (!token) {
      toast.error('Please enter a token');
      return;
    }

    setLoading(true);
    
    try {
      const valid = validateToken(token);
      setIsValid(valid);
      
      if (valid) {
        toast.success('Token is valid');
        if (onValidToken) {
          onValidToken();
        }
      } else {
        toast.error('Invalid token');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      toast.error('Error validating token');
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto p-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Key className="h-6 w-6 text-primary-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Token Validation</h3>
        <p className="text-gray-600 text-sm">Enter your authentication token to proceed</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            Authentication Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
            placeholder="Enter your token"
          />
        </div>
        
        {isValid !== null && (
          <div className={`p-3 rounded-lg flex items-center space-x-2 ${
            isValid ? 'bg-success-50 border border-success-200' : 'bg-error-50 border border-error-200'
          }`}>
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-success-600" />
            ) : (
              <XCircle className="h-5 w-5 text-error-600" />
            )}
            <p className={`text-sm ${isValid ? 'text-success-700' : 'text-error-700'}`}>
              {isValid ? 'Token is valid' : 'Invalid token'}
            </p>
          </div>
        )}
        
        <Button
          variant="primary"
          className="w-full"
          onClick={handleValidate}
          loading={loading}
        >
          Validate Token
        </Button>
      </div>
    </Card>
  );
}