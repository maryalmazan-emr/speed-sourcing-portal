// file: src/lib/api/invites.ts
import { apiGet, apiPost } from "@/lib/api/_client";

// ✅ Your UI calls apiGetInvites() and apiGetInvites(auction.id)
export function apiGetInvites(auctionId?: string) {
  const q = auctionId ? `?auctionId=${encodeURIComponent(auctionId)}` : "";
  return apiGet<any[]>(`/api/invites${q}`);
}

// ✅ matches your AdminSetup usage: apiCreateInvites(auctionId, vendors, 'manual')
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

// ✅ called during init in App.tsx
export async function apiMigrateInvites(): Promise<void> {
  // If you have a real endpoint, swap to:
  // await apiPost(`/api/invites/migrate`, {});
  return;
}