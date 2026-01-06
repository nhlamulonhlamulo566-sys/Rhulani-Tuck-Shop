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
  factory: () => T | null | undefined,
  deps: unknown[] = [],
  key?: string,
): (T & { __memo: true; __key: string }) | null {
  return useMemo(() => {
    const target = factory();
    if (!target || typeof target !== "object") {
      return null;
    }

    const memoKey = key ?? "default";

    if (!(target as any).__memo) {
      Object.defineProperties(target, {
        __memo: { value: true, writable: false, configurable: false },
        __key: { value: memoKey, writable: false, configurable: false },
      });
    }

    return target as T & { __memo: true; __key: string };
  }, [...deps, key]);
}
