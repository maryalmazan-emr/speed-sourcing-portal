import { useEffect } from "react";
import { ensureStarted, getAuctionHubConnection } from "./signalrClient";

type AuctionRealtimeOptions = {
  auctionId: string;
  vendorEmail?: string;
  onRefresh: () => void;
};

export function useAuctionRealtime({
  auctionId,
  vendorEmail,
  onRefresh,
}: AuctionRealtimeOptions) {
  useEffect(() => {
    if (!auctionId) return;

    const conn = getAuctionHubConnection();
    let isMounted = true;

    const start = async () => {
      await ensureStarted(conn);

      await conn.invoke("JoinAuction", auctionId);

      if (vendorEmail) {
        await conn.invoke("JoinVendor", auctionId, vendorEmail);
      }

      conn.on("auctionChanged", (payload: any) => {
        if (!isMounted) return;
        if (payload?.auctionId === auctionId) onRefresh();
      });

      conn.on("bidChanged", (payload: any) => {
        if (!isMounted) return;
        if (payload?.auctionId === auctionId) onRefresh();
      });

      conn.on("rankChanged", (payload: any) => {
        if (!isMounted) return;
        if (payload?.auctionId === auctionId) onRefresh();
      });
    };

    start().catch(console.error);

    return () => {
      isMounted = false;

      conn.off("auctionChanged");
      conn.off("bidChanged");
      conn.off("rankChanged");

      conn.invoke("LeaveAuction", auctionId).catch(() => {});
      if (vendorEmail) conn.invoke("LeaveVendor", auctionId, vendorEmail).catch(() => {});
    };
  }, [auctionId, vendorEmail, onRefresh]);
}