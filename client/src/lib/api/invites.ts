// File: src/lib/api/invites.ts
import { apiGet, apiPost } from "@/lib/api/_client";

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