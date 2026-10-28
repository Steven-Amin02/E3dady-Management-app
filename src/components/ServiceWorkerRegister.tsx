'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development or on local network dev, unregister service workers and purge caches
    // to prevent stale Turbopack/HMR chunks from causing runtime ReferenceErrors
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });

      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys.filter(key => key.startsWith('e3dady-'))) void caches.delete(key);
        });
      }
      return;
    }

    // Only register PWA service worker in production environments
    if (window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA ServiceWorker registered with scope: ', registration.scope);
        })
        .catch((err) => {
          console.warn('PWA ServiceWorker registration failed: ', err);
        });
    }
  }, []);

  return null;
}
