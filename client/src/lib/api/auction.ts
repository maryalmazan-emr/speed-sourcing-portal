// file: src/lib/api/auctions.ts
import { apiGet, apiPost, apiPatch } from "@/lib/api/_client";

export function apiGetAuctions(adminEmail?: string) {
  // Used both as apiGetAuctions() and apiGetAuctions(adminEmail)
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
  // Your UI calls apiUpdateAuction(id, { status, winner_vendor_email })
  return apiPatch<any>(`/api/auctions/${auctionId}`, patch);
}