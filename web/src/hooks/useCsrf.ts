'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage CSRF tokens for secure form submissions
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/csrf');
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  /**
   * Get headers with CSRF token for fetch requests
   */
  const getCsrfHeaders = useCallback((): HeadersInit => {
    return token ? { 'X-CSRF-Token': token } : {};
  }, [token]);

  /**
   * Fetch wrapper that automatically includes CSRF token
   */
  const secureFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);

      if (token) {
        headers.set('X-CSRF-Token', token);
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [token]
  );

  return {
    token,
    isLoading,
    error,
    refresh: fetchToken,
    getCsrfHeaders,
    secureFetch,
  };
}
