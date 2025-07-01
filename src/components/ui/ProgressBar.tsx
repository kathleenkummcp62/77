import React from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className, 
  color = 'primary',
  size = 'md',
  showLabel = false
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colors = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    error: 'bg-error-600',
    gray: 'bg-gray-400'
  } as const;
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{Math.round(percentage)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={clsx('bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={clsx('transition-all duration-300 ease-out rounded-full', colors[color], sizes[size])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}