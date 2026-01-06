'use client';
import { useSyncExternalStore } from 'react';

type Subscriber = () => void;

export interface StoreSnapshot<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface FirestoreStore<T> {
  subscribe: (callback: Subscriber) => () => void;
  getSnapshot: () => StoreSnapshot<T>;
}

// Internal map to cache stores by key
const storeCache = new Map<string, FirestoreStore<any>>();

/**
 * Returns a stable store for a given Firestore document.
 * Caches the store internally by `key` to ensure `useSyncExternalStore` stability.
 *
 * @param key Unique identifier for the store (usually the memoized doc.__key)
 * @param subscribeFn Function that subscribes to Firestore updates
 * @returns FirestoreStore<T>
 */
export function getStore<T>(
  key: string,
  subscribeFn: (onNext: (data: T | null) => void, onError: (err: Error) => void) => () => void
): FirestoreStore<T> {
  if (storeCache.has(key)) {
    return storeCache.get(key)!;
  }

  // Internal snapshot state
  let snapshot: StoreSnapshot<T> = {
    data: null,
    loading: true,
    error: null,
  };

  const listeners = new Set<Subscriber>();
  let unsubscribe: (() => void) | null = null;

  const emit = () => {
    listeners.forEach((l) => l());
  };
  
  const store: FirestoreStore<T> = {
    subscribe: (callback: Subscriber) => {
      listeners.add(callback);

      // Subscribe to Firestore when the first listener appears
      if (listeners.size === 1) {
        unsubscribe = subscribeFn(
          (data) => {
            snapshot = { data, loading: false, error: null };
            emit();
          },
          (error) => {
            snapshot = { data: null, loading: false, error };
            emit();
          }
        );
      }
      
      // Cleanup when last listener unsubscribes
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && unsubscribe) {
          unsubscribe();
          unsubscribe = null;
          // When the last component unmounts, we should remove the store from the cache.
          // This ensures that on re-mount, a fresh subscription is created.
          storeCache.delete(key); 
        }
      };
    },

    getSnapshot: () => snapshot,
  };

  storeCache.set(key, store);

  return store;
}
