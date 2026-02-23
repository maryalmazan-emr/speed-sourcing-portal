// File: src/lib/api.ts
// ✅ Single consolidated API module (no Next.js imports)
// ✅ Exports apiMigrateInvites so App.tsx compiles

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE ?? "";

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`PATCH ${url} failed (${res.status})`);

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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

// matches your UI usage: apiCreateInvites(auctionId, vendors, 'manual')
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

// ✅ FIX: export exists so App.tsx compile error is gone.
// If your backend has a migration endpoint later, wire it here.
export async function apiMigrateInvites(): Promise<void> {
  return;
}

// ------------------- Bids -------------------

export function apiGetBids(auctionId: string) {
  return apiGet<any[]>(`/api/auctions/${auctionId}/bids`);
}

// matches your UI usage: apiSubmitBid({ auction_id: ... })
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

// ------------------- Admin Accounts (if you have this endpoint) -------------------

export function apiGetAllAdmins() {
  return apiGet<any[]>(`/api/admins`);
}

export async function getAccounts() {
  const [admins, invites] = await Promise.all([apiGetAllAdmins(), apiGetInvites()]);
  const adminAccounts = (admins ?? []).map((a: any) => ({
    email: a.email,
    company_name: a.company_name ?? a.name ?? a.email,
    role: a.role ?? "internal_user",
  }));
  const vendorAccounts = (invites ?? []).map((i: any) => ({
    email: i.email ?? i.vendor_email,
    company_name: i.vendor_company ?? "External Guest",
    role: "external_guest",
  }));
  return [...adminAccounts, ...vendorAccounts];
}