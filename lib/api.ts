import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastStore } from '@/store/toastStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

const DEFAULT_TIMEOUT = 15000;

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Auto-attach auth token (default: true) */
  auth?: boolean;
  /** Request timeout in ms (default: 15000) */
  timeout?: number;
  /** Show error toast on failure (default: true) */
  showErrorToast?: boolean;
  /** JSON body - will be serialized automatically */
  body?: unknown;
}

interface ApiResponse<T> {
  data: T;
  ok: true;
}

interface ApiError {
  error: string;
  ok: false;
  status: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Centralized API fetch with auth, timeout, and error handling.
 *
 * Usage:
 *   const result = await apiFetch<{ hunts: Hunt[] }>('/hunts');
 *   if (result.ok) { ... result.data.hunts ... }
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  const {
    auth = true,
    timeout = DEFAULT_TIMEOUT,
    showErrorToast = true,
    body,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Response wasn't JSON
      }

      if (response.status === 401) {
        await AsyncStorage.removeItem('auth_token');
      }

      if (showErrorToast) {
        useToastStore.getState().show(errorMessage, 'error');
      }

      return { ok: false, error: errorMessage, status: response.status };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);

    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out'
        : 'Network error. Check your connection.';

    if (showErrorToast) {
      useToastStore.getState().show(message, 'error');
    }

    return { ok: false, error: message, status: 0 };
  }
}

export { API_BASE };
