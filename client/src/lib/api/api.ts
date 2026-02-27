// File: src/lib/api.ts
// ✅ Single consolidated API module (Vite-friendly)
// ✅ Better error messages (includes server response body on 4xx/5xx)
// ✅ Returns JSON safely (handles empty/204)

import { kv } from "@/lib/kv";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

// ✅ cache admins endpoint availability to prevent repeated 404 spam (polling)
let adminsEndpointAvailable: boolean | null = null;

async function readTextSafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function readJsonSafe<T>(res: Response): Promise<T> {
  const text = await readTextSafe(res);
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return (text as unknown) as T;
  }
}

async function throwHttpError(method: string, url: string, res: Response): Promise<never> {
  const bodyText = await readTextSafe(res);
  const detail = bodyText ? ` — ${bodyText}` : "";
  throw new Error(`${method} ${url} failed (${res.status})${detail}`);
}

async function apiGet<T>(url: string): Promise<T> {
  if (!url) {
    // Prevent accidental GET "/" calls
    throw new Error("GET (empty url) failed (400) — apiGet called with empty url");
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return throwHttpError("GET", url, res);
  return readJsonSafe<T>(res);
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return throwHttpError("POST", url, res);
  return readJsonSafe<T>(res);
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return throwHttpError("PATCH", url, res);
  return readJsonSafe<T>(res);
}

// ------------------- Auctions -------------------

export function apiGetAuctions(adminEmail?: string) {
  const q = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : "";
  return apiGet<any[]>(`/api/auctions${q}`);
}

export function apiGetAuction(auctionId: string) {
  return apiGet<any>(`/api/auctions/${auctionId}`);
}

export function apiCreateAuction(payload: any) {
  return apiPost<any>(`/api/auctions`, payload);
}

export function apiUpdateAuction(auctionId: string, patch: any) {
  return apiPatch<any>(`/api/auctions/${auctionId}`, patch);
}

// ------------------- Invites -------------------

export function apiGetInvites(auctionId?: string) {
  const q = auctionId ? `?auctionId=${encodeURIComponent(auctionId)}` : "";
  return apiGet<any[]>(`/api/invites${q}`);
}

export function apiCreateInvites(
  auctionId: string,
  vendors: Array<{ email: string; company: string }>,
  invite_method: string
) {
  return apiPost<any>(`/api/invites`, {
    auction_id: auctionId,
    vendors,
    invite_method,
  });
}

export async function apiMigrateInvites(): Promise<void> {
  return;
}

// ------------------- Bids -------------------

export function apiGetBids(auctionId: string) {
  return apiGet<any[]>(`/api/auctions/${auctionId}/bids`);
}

export function apiSubmitBid(payload: {
  auction_id: string;
  vendor_email: string;
  vendor_company: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  delivery_time_days: number;
  cost_per_unit: number;
  notes: string;
}) {
  return apiPost<any>(`/api/auctions/${payload.auction_id}/bids`, payload);
}

export function apiGetVendorBid(auctionId: string, vendorEmail: string) {
  return apiGet<any>(
    `/api/auctions/${auctionId}/bids/vendor?vendorEmail=${encodeURIComponent(vendorEmail)}`
  );
}

export function apiGetVendorRankInfo(auctionId: string, vendorEmail: string) {
  return apiGet<any>(
    `/api/auctions/${auctionId}/rank?vendorEmail=${encodeURIComponent(vendorEmail)}`
  );
}

// ------------------- Vendor Token -------------------

export function apiValidateVendorToken(token: string) {
  return apiPost<any>(`/api/vendor/validate`, { token });
}

export function apiUpdateVendorAccess(token: string) {
  return apiPost<void>(`/api/vendor/access`, { token });
}

// ------------------- Admin Accounts (kv-first; cache 404) -------------------

export async function apiGetAllAdmins(): Promise<any[]> {
  // ✅ First: try local kv to avoid network 404 spam during polling
  const local = await kv.get("admins");
  if (Array.isArray(local) && local.length > 0) return local;

  // ✅ If we already learned the endpoint is missing, don't call it again
  if (adminsEndpointAvailable === false) return [];

  try {
    const admins = await apiGet<any[]>(`/api/admins`);
    adminsEndpointAvailable = true;
    return Array.isArray(admins) ? admins : [];
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // ✅ 404: mark missing, return kv result (even if empty)
    if (msg.includes("GET /api/admins failed (404)")) {
      adminsEndpointAvailable = false;
      const fallback = await kv.get("admins");
      return Array.isArray(fallback) ? fallback : [];
    }

    // Other errors: rethrow
    throw e;
  }
}

// Returns BOTH internal/admin accounts and vendor invite accounts
export async function getAccounts() {
  const [admins, invites] = await Promise.all([apiGetAllAdmins(), apiGetInvites()]);

  const adminAccounts = (admins ?? [])
    .map((a: any) => ({
      id: a.id ?? a.email,
      email: a.email,
      company_name: a.company_name ?? a.name ?? a.email,
      role: a.role ?? "internal_user",
    }))
    .filter((a: any) => !!a.email);

  const vendorAccounts = (invites ?? [])
    .map((i: any) => ({
      id: i.id ?? `${i.vendor_email ?? i.email}-invite`,
      email: (i.email ?? i.vendor_email) as string,
      company_name: i.vendor_company ?? "External Guest",
      role: "external_guest",
    }))
    .filter((v: any) => !!v.email);

  // Dedup by email+role
  const seen = new Set<string>();
  const combined: any[] = [];
  for (const a of [...adminAccounts, ...vendorAccounts]) {
    const key = `${String(a.email).toLowerCase()}|${a.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(a);
  }

  return combined;
}