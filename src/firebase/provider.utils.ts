// src/firebase/provider.utils.ts
import { useMemo } from "react";

/**
 * Safely memoizes any object.
 * Returns null if target is null/undefined.
 *
 * @template T - Type of the object to memoize
 * @param target - The object to memoize (can be null/undefined)
 * @param key - Unique key for memoization
 * @param deps - Optional dependency array
 * @returns The memoized object with internal properties, or null if target is null
 */
export function useMemoFirebase<T extends object>(
  target: T | null | undefined,
  key: string,
  deps: unknown[] = []
): (T & { __memo: true; __key: string }) | null {
  return useMemo(() => {
    if (!target || typeof target !== "object") {
      // Null-safe: return null if target is missing
      return null;
    }

    // Only define memo properties if not already present
    if (!(target as any).__memo) {
      Object.defineProperties(target, {
        __memo: { value: true, writable: false, configurable: false },
        __key: { value: key, writable: false, configurable: false },
      });
    }

    return target as T & { __memo: true; __key: string };
  }, [...deps, key]);
}
