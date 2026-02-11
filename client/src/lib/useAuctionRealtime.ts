import { useEffect } from "react";
import { ensureStarted, getAuctionHubConnection } from "./signalrClient";

type AuctionRealtimeOptions = {
  auctionId: string;
  vendorEmail?: string;
  onRefresh: () => void;
};

export function useAuctionRealtime({ auctionId, vendorEmail, onRefresh }: AuctionRealtimeOptions) {
  useEffect(() => {
    if (!auctionId) return;

    const conn = getAuctionHubConnection();
    let isMounted = true;

    const start = async () => {
      await ensureStarted(conn);

      // join a group so the server can broadcast only to this auction
      await conn.invoke("JoinAuction", auctionId);

      // Optional vendor-scoped join (if you want private vendor events)
      if (vendorEmail) {
        await conn.invoke("JoinVendor", auctionId, vendorEmail);
      }

      // When server says something changed, refresh status
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
      // Leaving groups is optional; reconnect logic may handle it
      conn.invoke("LeaveAuction", auctionId).catch(() => {});
      if (vendorEmail) conn.invoke("LeaveVendor", auctionId, vendorEmail).catch(() => {});
    };
  }, [auctionId, vendorEmail, onRefresh]);
}