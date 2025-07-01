import React, { useEffect, useState } from 'react';
import { isAuthenticated, getCurrentUser, hasRole } from '../../lib/auth';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'viewer';
}

export function AuthGuard({ children, requiredRole = 'viewer' }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      
      if (authenticated) {
        const user = getCurrentUser();
        
        if (user) {
          dispatch(setUser(user));
          
          if (requiredRole && !hasRole(requiredRole)) {
            setIsAuthorized(false);
          } else {
            setIsAuthorized(true);
          }
        } else {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [dispatch, requiredRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isAuthenticated() ? 'Access Denied' : (showRegister ? 'Create Account' : 'Sign in to your account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isAuthenticated() 
              ? `You don't have the required permissions (${requiredRole} role needed)`
              : (showRegister 
                  ? 'Register to access the dashboard' 
                  : 'Please sign in to access the dashboard')}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {showRegister ? (
            <RegisterForm onSuccess={() => setIsAuthorized(true)} />
          ) : (
            <LoginForm onSuccess={() => setIsAuthorized(true)} />
          )}
          
          {!isAuthenticated() && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => setShowRegister(!showRegister)}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                {showRegister ? 'Back to login' : 'Need an account? Register'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}