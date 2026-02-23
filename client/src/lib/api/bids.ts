// file: src/lib/api/bids.ts
import { apiGet, apiPost } from "@/lib/api/_client";

export function apiGetBids(auctionId: string) {
  return apiGet<any[]>(`/api/auctions/${auctionId}/bids`);
}

// ✅ matches your VendorDashboard usage: apiSubmitBid({ auction_id: ... })
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
    `/api/auctions/${auctionId}/bids/vendor?vendorEmail=${encodeURIComponent(
      vendorEmail
    )}`
  );
}

// ✅ matches BidsController.GetRank
export function apiGetVendorRankInfo(auctionId: string, vendorEmail: string) {
  return apiGet<any>(
    `/api/auctions/${auctionId}/rank?vendorEmail=${encodeURIComponent(
      vendorEmail
    )}`
  );
}