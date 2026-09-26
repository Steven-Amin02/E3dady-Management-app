'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
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
