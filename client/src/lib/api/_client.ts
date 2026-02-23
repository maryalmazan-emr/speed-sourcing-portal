// File: src/lib/api/_client.ts

// Vite exposes env vars via import.meta.env, and only VITE_* are available to client code.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ""; // [1](https://emerson.sharepoint.com/sites/AutoSol/IT/SDC/Cloud-Native/_layouts/15/Doc.aspx?sourcedoc=%7BBA59F881-23D2-40A6-ADB7-E37B3AA89351%7D&file=Web%20Application%28custom%20domain%29.docx&action=default&mobileredirect=true&DefaultItemOpen=1)

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);

  // Some endpoints return 204; keep this safe
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`PATCH ${url} failed (${res.status})`);

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}