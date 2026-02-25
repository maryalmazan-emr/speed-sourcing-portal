// File: src/lib/api/auctions.ts

import { apiGet, apiPost, apiPatch } from "@/lib/api/_client";

/**
 * Auctions API (ASP.NET backend)
 * With Vite proxy, API_BASE can be empty and requests still work.
 */
export function apiGetAuctions(adminEmail?: string) {
  const q = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : "";
  return apiGet<any[]>(`/api/auctions${q}`);
}

export function apiGetAuction(auctionId: string) {
  return apiGet<any>(`/api/auctions/${auctionId}`);
}

export function apiCreateAuction(payload: any) {
  // ✅ Send payload exactly as AdminSetup builds it (ASP.NET expects snake_case)
  return apiPost<any>(`/api/auctions`, payload);
}

export function apiUpdateAuction(auctionId: string, patch: any) {
  return apiPatch<any>(`/api/auctions/${auctionId}`, patch);
}