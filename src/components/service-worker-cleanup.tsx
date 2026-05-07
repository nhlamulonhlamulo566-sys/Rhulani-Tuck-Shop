'use client';

import { useEffect } from 'react';

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch((error) => {
              console.error('Failed to unregister service worker:', error);
            });
          });
        })
        .catch((error) => {
          console.error('Error fetching service worker registrations:', error);
        });
    }
  }, []);

  return null;
}
