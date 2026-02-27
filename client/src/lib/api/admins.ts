// File: src/lib/api/admins.ts
import { kv } from "@/lib/kv";
import { apiGet } from "@/lib/api/_client";

// ✅ cache endpoint availability to avoid repeated 404 spam in polling
let adminsEndpointAvailable: boolean | null = null;

export async function apiGetAllAdmins() {
  // ✅ kv-first to avoid hitting a missing endpoint
  const local = await kv.get("admins");
  if (Array.isArray(local) && local.length > 0) return local;

  if (adminsEndpointAvailable === false) return [];

  try {
    const admins = await apiGet<any[]>(`/api/admins`);
    adminsEndpointAvailable = true;
    return Array.isArray(admins) ? admins : [];
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("GET /api/admins failed (404)")) {
      adminsEndpointAvailable = false;
      const fallback = await kv.get("admins");
      return Array.isArray(fallback) ? fallback : [];
    }
    throw e;
  }
}