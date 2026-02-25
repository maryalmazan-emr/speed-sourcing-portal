// File: src/lib/api/_client.ts
console.log("VITE_API_BASE =", import.meta.env.VITE_API_BASE);



const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

async function readJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function throwHttpError(method: string, url: string, res: Response): Promise<never> {
  const body = await res.text();
  throw new Error(`${method} ${url} failed (${res.status}) ${body}`);
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return throwHttpError("GET", url, res);
  return readJsonSafe<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return throwHttpError("POST", url, res);
  return readJsonSafe<T>(res);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return throwHttpError("PATCH", url, res);
  return readJsonSafe<T>(res);
}
