/**
 * Fetch wrapper with timeout support using AbortController
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch with automatic timeout
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout (default: 15000ms)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 15000, signal: externalSignal, ...fetchOptions } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // If an external signal was provided, abort our controller when it aborts
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort());
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch JSON with timeout
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout
 * @returns Promise<T>
 */
export async function fetchJSON<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export default fetchWithTimeout;
