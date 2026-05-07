'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseCollectionResult<T> {
  data: (T & { id: string })[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollection<T = any>(endpoint: string): UseCollectionResult<T> {
  const [data, setData] = useState<(T & { id: string })[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiPath = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
      const response = await fetch(`${apiPath}?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
