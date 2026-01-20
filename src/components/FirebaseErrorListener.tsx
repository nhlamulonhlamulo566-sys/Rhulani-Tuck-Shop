'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * In development, it throws the error to be caught by Next.js's overlay.
 * In production, it could log to a service but currently does nothing to avoid crashing the app.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In development, we want to see the error overlay.
      if (process.env.NODE_ENV === 'development') {
        setError(error);
      } else {
        // In production, you would log this to a monitoring service.
        // For now, we'll just log it to the console to avoid crashing.
        console.error("Firestore Permission Error:", error.message);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // Only throw the error in development.
  if (error && process.env.NODE_ENV === 'development') {
    throw error;
  }

  // This component renders nothing.
  return null;
}
