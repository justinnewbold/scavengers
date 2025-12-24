'use client';

import { useEffect, useRef } from 'react';

export function ServiceWorkerRegistration() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const handleControllerChange = () => {
      console.log('New service worker activated');
    };

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);

        // Check for updates periodically
        intervalRef.current = setInterval(() => {
          registration?.update().catch((err) => {
            console.error('Service Worker update failed:', err);
          });
        }, 60 * 60 * 1000); // Check every hour
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Register after page load
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
