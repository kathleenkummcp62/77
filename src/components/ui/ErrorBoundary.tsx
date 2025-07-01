import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console or error tracking service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <Card className="max-w-2xl mx-auto my-8 border-error-300">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-error-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
              <div className="bg-gray-100 p-4 rounded-md mb-4 overflow-auto max-h-64">
                <p className="font-mono text-sm text-error-700 whitespace-pre-wrap">
                  {this.state.error?.toString() || 'Unknown error'}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-700 cursor-pointer">Stack trace</summary>
                    <p className="font-mono text-xs text-gray-600 whitespace-pre-wrap mt-2">
                      {this.state.errorInfo.componentStack}
                    </p>
                  </details>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}