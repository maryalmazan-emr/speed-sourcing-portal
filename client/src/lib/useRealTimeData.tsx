import { useEffect, useRef, useState } from "react";

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

  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchRef.current();
      setData(result);
      setLastUpdate(new Date());

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({ ts: Date.now() }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    let id: number | undefined;
    if (enablePolling) {
      id = window.setInterval(load, pollingInterval);
    }

    return () => {
      if (id) window.clearInterval(id);
    };
  }, [enablePolling, pollingInterval]);

  useEffect(() => {
    if (!enableStorageWatch || !storageKey) return;

    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) load();
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [enableStorageWatch, storageKey]);

  return { data, loading, lastUpdate, refresh: load };
}

export function LastUpdateIndicator({ lastUpdate }: { lastUpdate: Date | null }) {
  if (!lastUpdate) return null;

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Updated {lastUpdate.toLocaleTimeString()}
    </span>
  );
}
