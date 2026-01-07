'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import {
  DocumentReference,
  DocumentData,
  onSnapshot,
} from 'firebase/firestore';

import { getStore } from './firestore-store';
import { assertMemoized } from './firestore-dev-guards';

export interface UseDocResult<T> {
  data: (T & { id: string }) | null;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_SNAPSHOT = { data: null, loading: false, error: null };

const EMPTY_STORE = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAPSHOT,
};

export function useDoc<T>(
  target: (DocumentReference<DocumentData> & { __memo: true; __key: string }) | null
): UseDocResult<T> {
  const store = useMemo(() => {
    if (!target) return EMPTY_STORE;

    assertMemoized(target);

    return getStore<(T & { id: string }) | null>(target.__key, (onNext, onError) =>
      onSnapshot(
        target,
        (snap) =>
          onNext(
            snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as any) : null
          ),
        onError
      )
    );
  }, [target]);

  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return {
    data: snap.data,
    isLoading: snap.loading,
    error: snap.error,
  };
}
