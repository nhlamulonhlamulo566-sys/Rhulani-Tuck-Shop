'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import {
  Query,
  CollectionReference,
  DocumentData,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

import { getStore } from './firestore-store';
import { assertMemoized } from './firestore-dev-guards';

export interface UseCollectionResult<T> {
  data: (T & { id: string })[] | null;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_SNAPSHOT = { data: null, error: null, loading: false };

const EMPTY_STORE = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAPSHOT,
};

export function useCollection<T>(
  target:
    | ((Query<DocumentData> | CollectionReference<DocumentData>) & {
        __memo: true;
        __key: string;
      })
    | null,
): UseCollectionResult<T> {
  const store = useMemo(() => {
    if (!target) {
      return EMPTY_STORE;
    }
    assertMemoized(target);
    return getStore<(T & { id: string })[]>(
      target.__key,
      (onNext, onError) => {
        let unsub: () => void = () => {};

        // First try to fetch a fast initial snapshot using getDocs()
        // so UIs like POS don't wait for the realtime listener to warm up.
        getDocs(target)
          .then((snap) => {
            onNext(
              snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
            );
          })
          .catch((err) => {
            // If initial fetch fails, notify the store error but continue to set up onSnapshot
            onError(err);
          })
          .finally(() => {
            // Then subscribe to realtime updates
            unsub = onSnapshot(
              target,
              (snap) =>
                onNext(
                  snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
                ),
              onError,
            );
          });

        return () => unsub();
      },
    );
  }, [target]);

  const snap = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    data: snap.data,
    isLoading: snap.loading,
    error: snap.error,
  };
}
