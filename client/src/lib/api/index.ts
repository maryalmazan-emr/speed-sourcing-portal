// File: src/lib/api/index.ts

// ✅ Core API helpers (fetch wrappers, shared endpoints)
export {
  apiGetAuctions,
  apiGetAuction,
  apiCreateAuction,
  apiUpdateAuction,
  apiMigrateInvites,
  apiValidateVendorToken,
  apiUpdateVendorAccess,
  apiGetVendorBid,
} from "./api";

// ✅ Domain-specific APIs
export {
  apiGetInvites,
  apiCreateInvites,
} from "./invites";

export {
  apiGetBids,
  apiSubmitBid,
} from "./bids";

export async function apiGetVendorRankInfo(
  auctionId: string,
  vendorEmail: string
) {
  return fetch(
    `/api/auctions/${auctionId}/rank?vendorEmail=${encodeURIComponent(vendorEmail)}`
  ).then(res => {
    if (!res.ok) throw new Error("Failed to fetch vendor rank");
    return res.json();
  });
}