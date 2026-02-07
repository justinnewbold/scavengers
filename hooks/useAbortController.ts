import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook that provides an AbortController for cancelling fetch requests
 * when a component unmounts (e.g., during navigation).
 *
 * @returns An object with the current AbortSignal and a reset function.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { signal, reset } = useAbortController();
 *
 *   useEffect(() => {
 *     fetch('https://api.example.com/data', { signal })
 *       .then(res => res.json())
 *       .catch(err => {
 *         if (err.name === 'AbortError') return; // Unmounted, ignore
 *         console.error(err);
 *       });
 *   }, [signal]);
 *
 *   const refetch = () => {
 *     reset(); // Creates a new controller so the next fetch uses a fresh signal
 *   };
 * }
 * ```
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController>(new AbortController());

  const reset = useCallback(() => {
    // Abort the current controller before replacing it
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  useEffect(() => {
    // Create a fresh controller on mount in case the ref was carried over
    controllerRef.current = new AbortController();

    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return {
    /** The AbortSignal to pass to fetch calls */
    signal: controllerRef.current.signal,
    /** Abort the current controller and create a new one. Returns the new signal. */
    reset,
  };
}
