// File: src/lib/api.ts
/**
 * API Layer - Node + Express backend version
 * Frontend calls your Node API (local now, Azure later)
 */

import type * as backend from "./backend";
import { apiJson, apiUrl } from "./apiClient";

/**
 * Admin APIs
 */
export async function apiCreateAdmin(
  email: string,
  password: string,
  company_name: string,
  role: backend.Admin["role"]
) {
  return apiJson<backend.Admin>("/api/admins", {
    method: "POST",
    body: JSON.stringify({ email, password, company_name, role }),
  });
}

/**
 * IMPORTANT:
 * Your Node backend endpoint is POST /api/admin/login (not /api/admins/validate).
 * This prevents the "Unexpected token '<' ... not valid JSON" issue.
 */
export async function apiValidateAdmin(email: string, password: string) {
  return apiJson<backend.Admin | null>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetAllAdmins() {
  return apiJson<backend.Admin[]>("/api/admins");
}

export async function getAccounts() {
  return apiJson<backend.Account[]>("/api/accounts");
}

/**
 * Auction APIs
 */
export async function apiCreateAuction(
  auction: Omit<backend.Auction, "id" | "created_at" | "status">
) {
  return apiJson<backend.Auction>("/api/auctions", {
    method: "POST",
    body: JSON.stringify(auction),
  });
}

export async function apiGetAuctions(adminId?: string) {
  const qs = adminId ? `?adminId=${encodeURIComponent(adminId)}` : "";
  return apiJson<backend.Auction[]>(`/api/auctions${qs}`);
}

export async function apiGetAuction(auctionId: string) {
  return apiJson<backend.Auction>(
    `/api/auctions/${encodeURIComponent(auctionId)}`
  );
}

export async function apiUpdateAuction(
  auctionId: string,
  updates: Partial<backend.Auction>
) {
  return apiJson<backend.Auction>(
    `/api/auctions/${encodeURIComponent(auctionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Vendor Invite APIs
 */
export async function apiCreateInvites(
  auctionId: string,
  vendors: Array<{ email: string; company: string }>,
  method: "manual" | "email"
) {
  return apiJson<backend.VendorInvite[]>(
    `/api/auctions/${encodeURIComponent(auctionId)}/invites`,
    {
      method: "POST",
      body: JSON.stringify({ vendors, method }),
    }
  );
}

export async function apiGetInvites(auctionId?: string) {
  const qs = auctionId ? `?auctionId=${encodeURIComponent(auctionId)}` : "";
  return apiJson<any[]>(`/api/invites${qs}`);
}

export async function apiValidateVendorToken(token: string) {
  return apiJson<any>("/api/vendor/validate", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function apiUpdateVendorAccess(token: string) {
  return apiJson<void>("/api/vendor/access", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Bid APIs
 */
export async function apiSubmitBid(
  bid: Omit<backend.Bid, "id" | "submitted_at" | "total_cost">
) {
  return apiJson<backend.Bid>(
    `/api/auctions/${encodeURIComponent(bid.auction_id)}/bids`,
    {
      method: "POST",
      body: JSON.stringify(bid),
    }
  );
}

export async function apiGetBids(auctionId: string) {
  return apiJson<backend.Bid[]>(
    `/api/auctions/${encodeURIComponent(auctionId)}/bids`
  );
}

export async function apiGetVendorBid(auctionId: string, vendorEmail: string) {
  const qs = `?vendorEmail=${encodeURIComponent(vendorEmail)}`;
  return apiJson<backend.Bid | null>(
    `/api/auctions/${encodeURIComponent(auctionId)}/bids/vendor${qs}`
  );
}

export async function apiGetVendorRankInfo(
  auctionId: string,
  vendorEmail: string
) {
  const qs = `?vendorEmail=${encodeURIComponent(vendorEmail)}`;
  return apiJson<any>(
    `/api/auctions/${encodeURIComponent(auctionId)}/rank${qs}`
  );
}

/**
 * Client-side fallback ranking (NOT authoritative)
 */
export async function apiRankBids(bids: backend.Bid[]) {
  const sorted = [...bids].sort((a, b) => {
    if (a.delivery_time_days !== b.delivery_time_days) {
      return a.delivery_time_days - b.delivery_time_days;
    }
    return a.total_cost - b.total_cost;
  });

  return sorted.map((bid, index) => ({
    ...bid,
    rank: index + 1,
  }));
}

/**
 * Supplier APIs
 */
export async function apiGetSupplierHistory() {
  return apiJson<backend.Supplier[]>("/api/suppliers");
}

export async function apiSaveSuppliers(suppliers: backend.Supplier[]) {
  return apiJson<void>("/api/suppliers", {
    method: "PUT",
    body: JSON.stringify({ suppliers }),
  });
}

/**
 * Migration APIs
 *
 * IMPORTANT:
 * Your Node backend stub endpoint is POST /api/invites/migrate
 * (not /api/migrations/invites).
 */
export async function apiMigrateInvites() {
  return apiJson<any>("/api/invites/migrate", { method: "POST" });
}

/**
 * Backward compatibility
 */
export async function apiCall(
  path: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(apiUrl(path), options);
}

export function getApiUrl(path: string): string {
  return apiUrl(path);
}