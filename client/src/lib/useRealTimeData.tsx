// File: src/lib/useRealTimeData.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseRealTimeDataOptions<T> = {
  fetchData: () => Promise<T>;
  pollingInterval?: number;
  storageKey?: string;
  enablePolling?: boolean;
  enableStorageWatch?: boolean;
};

export function useRealTimeData<T>({
  fetchData,
  pollingInterval = 5000,
  storageKey,
  enablePolling = true,
  enableStorageWatch = true,
}: UseRealTimeDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Always use latest fetchData without re-subscribing intervals
  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;

  // Prevent overlapping requests (important when polling + storage events happen)
  const inflightRef = useRef(false);

  // Prevent state updates after unmount
  const mountedRef = useRef(true);

  // Debounce storage-triggered reloads (localStorage events can fire in bursts)
  const storageDebounceRef = useRef<number | null>(null);

  const writeStoragePing = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ts: Date.now() }));
    } catch {
      // ignore storage errors (private mode / quota)
    }
  }, [storageKey]);

  const load = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await fetchRef.current();

      if (!mountedRef.current) return;

      setData(result);
      setLastUpdate(new Date());

      // Notify other tabs / listeners
      writeStoragePing();
    } catch (e: any) {
      if (!mountedRef.current) return;

      const msg =
        typeof e?.message === "string" ? e.message : "Failed to load data";
      setError(msg);
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [writeStoragePing]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (storageDebounceRef.current) {
        window.clearTimeout(storageDebounceRef.current);
        storageDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Initial load
    void load();

    // Polling
    let id: number | undefined;
    if (enablePolling) {
      id = window.setInterval(() => {
        void load();
      }, pollingInterval);
    }

    return () => {
      if (id) window.clearInterval(id);
    };
  }, [enablePolling, pollingInterval, load]);

  useEffect(() => {
    if (!enableStorageWatch || !storageKey) return;

    const handler = (e: StorageEvent) => {
      if (e.key !== storageKey) return;

      // Debounce to avoid rapid refetch storms
      if (storageDebounceRef.current) {
        window.clearTimeout(storageDebounceRef.current);
      }
      storageDebounceRef.current = window.setTimeout(() => {
        storageDebounceRef.current = null;
        void load();
      }, 150);
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [enableStorageWatch, storageKey, load]);

  return { data, loading, error, lastUpdate, refresh: load };
}

export function LastUpdateIndicator({ lastUpdate }: { lastUpdate: Date | null }) {
  if (!lastUpdate) return null;

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Updated {lastUpdate.toLocaleTimeString()}
    </span>
  );
}