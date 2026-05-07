'use client';

import { useState, useEffect } from 'react';

export interface UseDocResult<T> {
  data: (T & { id: string }) | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDoc<T = any>(docId: string | null, endpoint: string): UseDocResult<T> {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${endpoint}/${docId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [docId, endpoint]);

  return { data, isLoading, error };
}
