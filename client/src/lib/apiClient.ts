const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Calls your .NET backend and returns JSON.
 * Throws a useful Error message on non-2xx responses.
 */
export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${text || "Request failed"}`);
  }

  // Handle empty response
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

/** Convenience: builds full URL for debugging */
export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}