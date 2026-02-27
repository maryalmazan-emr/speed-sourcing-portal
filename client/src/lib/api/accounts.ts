// File: src/lib/api/accounts.ts

import { apiGetInvites } from "@/lib/api/invites";
import { apiGet } from "@/lib/api/_client";
import { kv } from "@/lib/kv";

// ✅ Cache endpoint availability to prevent repeated 404 spam (polling)
let adminsEndpointAvailable: boolean | null = null;

// Accounts.tsx imports apiGetAllAdmins from '@/lib/api'
export async function apiGetAllAdmins(): Promise<any[]> {
  // ✅ kv-first: avoid network if local admins exist
  const local = await kv.get("admins");
  if (Array.isArray(local) && local.length > 0) return local;

  // ✅ If we've already learned the endpoint is missing, never call it again
  if (adminsEndpointAvailable === false) return [];

  try {
    const admins = await apiGet<any[]>(`/api/admins`);
    adminsEndpointAvailable = true;
    return Array.isArray(admins) ? admins : [];
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // ✅ If /api/admins doesn’t exist in this environment, fall back to kv and stop retrying
    if (msg.includes("GET /api/admins failed (404)")) {
      adminsEndpointAvailable = false;
      const fallback = await kv.get("admins");
      return Array.isArray(fallback) ? fallback : [];
    }

    // Other errors should still surface
    throw e;
  }
}

// MessagingCenter.tsx imports getAccounts from '@/lib/api'
export async function getAccounts() {
  // Safe “best-effort” merge; /api/admins falls back to kv if missing.
  const [admins, invites] = await Promise.all([apiGetAllAdmins(), apiGetInvites()]);

  const adminAccounts = (admins ?? []).map((a: any) => ({
    id: a.id ?? a.email,
    email: a.email,
    company_name: a.company_name ?? a.name ?? a.email,
    role: a.role ?? "internal_user",
  }));

  const vendorAccounts = (invites ?? []).map((i: any) => ({
    id: i.id ?? `${i.email ?? i.vendor_email}-invite`,
    email: i.email ?? i.vendor_email,
    company_name: i.vendor_company ?? "External Guest",
    role: "external_guest",
  }));

  // ✅ Deduplicate by email + role (prevents duplicates when many invites exist)
  const seen = new Set<string>();
  const merged: any[] = [];

  for (const a of [...adminAccounts, ...vendorAccounts]) {
    const key = `${String(a.email).toLowerCase()}|${a.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(a);
  }

  return merged;
}