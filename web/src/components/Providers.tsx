'use client';

import { ReactNode } from 'react';
import { ToastProvider } from './Toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
