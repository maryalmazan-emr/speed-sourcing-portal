import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Trophy, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";
import {
  apiGetVendorBid,
  apiSubmitBid,
  apiGetVendorRankInfo,
  apiUpdateVendorAccess,
} from "@/lib/api";

import { addNotification } from "@/lib/notifications";

interface VendorDashboardProps {
  auction: any;
  session: any;
  onLogout: () => void;
}

export function VendorDashboard({
  auction,
  session,
  onLogout,
}: VendorDashboardProps) {
  const [deliveryTime, setDeliveryTime] = useState("");
  const [price, setPrice] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  // Use refs for notification tracking to avoid dependency issues
  const previousRankRef = useRef<number | null>(null);
  const auctionStartNotifiedRef = useRef(false);
  const auctionEndNotifiedRef = useRef(false);

  const isAuctionActive = useCallback(() => {
    if (!auction) return false;
    if (auction.status !== "active") return false;
    const now = new Date();
    const startsAt = new Date(auction.starts_at);
    const endsAt = new Date(auction.ends_at);
    return now >= startsAt && endsAt > now;
  }, [auction]);

  const hasAuctionStarted = useCallback(() => {
    if (!auction) return false;
    return new Date() >= new Date(auction.starts_at);
  }, [auction]);

  const hasAuctionEnded = useCallback(() => {
    if (!auction) return false;
    return new Date() > new Date(auction.ends_at);
  }, [auction]);

  const updateAccessTracking = useCallback(async () => {
    try {
      if (session?.session_token) {
        await apiUpdateVendorAccess(session.session_token);
        console.log("[VendorDashboard] Updated access tracking");
      }
    } catch (error) {
      console.error("Error updating access tracking:", error);
    }
  }, [session]);

  const loadStatus = useCallback(async () => {
    if (!auction || !session) return;

    try {
      setLoading(true);

      // Get vendor's bid
      const vendorBid = await apiGetVendorBid(auction.id, session.vendor_email);

      // Get vendor's rank info
      const rankInfo = await apiGetVendorRankInfo(auction.id, session.vendor_email);

      // Combine into status object with expected field names
      const data = {
        vendor_bid: vendorBid,
        rank: rankInfo?.your_rank ?? null,
        total_bids: rankInfo?.total_participants ?? 0,
        leading_delivery_time: rankInfo?.leading_delivery_time ?? null,
        leading_price: rankInfo?.leading_cost ?? null,
      };

      // Track rank changes using ref to avoid dependency issues
      const currentRank = data.rank;
      const prevRank = previousRankRef.current;

      if (
        isAuctionActive() &&
        prevRank !== null &&
        currentRank !== null &&
        prevRank !== currentRank
      ) {
        if (currentRank < prevRank) {
          addNotification({
            vendor_email: session.vendor_email,
            auction_id: auction.id,
            type: "rank_change",
            title: "Rank Improved",
            message: `Your position has improved from #${prevRank} to #${currentRank}.`,
            old_rank: prevRank,
            new_rank: currentRank,
          });
        } else {
          addNotification({
            vendor_email: session.vendor_email,
            auction_id: auction.id,
            type: "rank_change",
            title: "Rank Changed",
            message: `Your position has changed from #${prevRank} to #${currentRank}. Consider updating your bid.`,
            old_rank: prevRank,
            new_rank: currentRank,
          });
        }
      }

      // Update ref
      if (currentRank !== null) {
        previousRankRef.current = currentRank;
      }

      setStatus(data);

      if (vendorBid) {
        setDeliveryTime(vendorBid.delivery_time_days?.toString() || "");
        setPrice((vendorBid.cost_per_unit || vendorBid.price)?.toString() || "");

        if (vendorBid.company_name) {
          setCompanyName(vendorBid.company_name);
          setContactName(vendorBid.contact_name || "");
          setContactPhone(vendorBid.contact_phone || "");
          setShowCompanyForm(false);
        } else {
          setShowCompanyForm(true);
        }
      } else {
        setShowCompanyForm(true);
      }
    } catch (error) {
      console.error("Error loading status:", error);
    } finally {
      setLoading(false);
    }
  }, [auction, session, isAuctionActive]);

  // Load status on mount and set up polling
  useEffect(() => {
    if (!auction || !session) return;

    updateAccessTracking();
    loadStatus();

    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [auction, session, updateAccessTracking, loadStatus]);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate company info for first-time bidders
    if (showCompanyForm && (!companyName || !contactName)) {
      toast.error("Please provide your company name and contact name");
      return;
    }

    setSubmitting(true);

    try {
      await apiSubmitBid({
        auction_id: auction.id,
        vendor_email: session.vendor_email,
        vendor_company: companyName, // Use companyName for vendor_company
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone || "",
        delivery_time_days: parseFloat(deliveryTime),
        cost_per_unit: parseFloat(price),
        notes: "",
      });

      toast.success("Bid submitted successfully!");
      setShowCompanyForm(false); // Hide company form after first submission
      loadStatus();
    } catch (error: any) {
      console.error("Bid submission error:", error);
      toast.error(error.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const getRankBadge = () => {
    if (!status || !status.rank) return null;

    if (status.rank === 1) {
      return (
        <Badge className="bg-[#00573d] text-white border-0">
          <Trophy className="h-3 w-3 mr-1" />
          Leading
        </Badge>
      );
    } else if (status.rank === 2) {
      return (
        <Badge className="bg-[#004b8d] text-white border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Close
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-[#75787c] text-white border-0">
          <Award className="h-3 w-3 mr-1" />
          Improve
        </Badge>
      );
    }
  };

  // Check for auction start and end - poll every second for real-time updates
  useEffect(() => {
    if (!auction || !session) return;

    const checkAuctionStatus = () => {
      // Check if auction just started (using ref to avoid infinite loop)
      if (hasAuctionStarted() && !auctionStartNotifiedRef.current) {
        addNotification({
          vendor_email: session.vendor_email,
          auction_id: auction.id,
          type: "auction_start",
          title: "Auction Started",
          message: `The auction "${auction.title}" is now live. Submit your best bid.`,
        });
        auctionStartNotifiedRef.current = true;
      }

      // Check if auction just ended (using ref to avoid infinite loop)
      if (hasAuctionEnded() && !auctionEndNotifiedRef.current) {
        addNotification({
          vendor_email: session.vendor_email,
          auction_id: auction.id,
          type: "auction_end",
          title: "Auction Ended",
          message: `The auction "${auction.title}" has concluded. The admin will review bids and select a winner.`,
        });
        auctionEndNotifiedRef.current = true;
      }
    };

    checkAuctionStatus();
    const interval = setInterval(checkAuctionStatus, 1000);
    return () => clearInterval(interval);
  }, [auction, session, hasAuctionStarted, hasAuctionEnded]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Logged in as: {session.vendor_email}
          </p>
          {loading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Refreshing…
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onLogout}>
          Logout
        </Button>
      </div>

      {/* Auction Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{auction.title}</CardTitle>
          <CardDescription>{auction.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {auction.product_details && (
              <div>
                <span className="text-gray-600 dark:text-gray-300">
                  Part Numbers &amp; Qty:
                </span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {auction.product_details}
                </div>
              </div>
            )}

            {auction.delivery_location && (
              <div>
                <span className="text-gray-600 dark:text-gray-300">
                  Delivery Location:
                </span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {auction.delivery_location}
                </div>
              </div>
            )}

            <div>
              <span className="text-gray-600 dark:text-white">Status:</span>
              <div>
                {!hasAuctionStarted() ? (
                  <Badge className="bg-gray-100/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    Not Started
                  </Badge>
                ) : (
                  <Badge variant={isAuctionActive() ? "default" : "secondary"}>
                    {isAuctionActive() ? "Active" : "Ended"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {auction.notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Notes:
              </span>
              <div className="text-sm mt-1 text-gray-900 dark:text-white">
                {auction.notes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Rank Card */}
      {status && status.rank > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  #{status.rank}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  out of {status.total_bids} bid{status.total_bids !== 1 ? "s" : ""}
                </div>
              </div>
              <div>{getRankBadge()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitive Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Competitive Stats (Anonymous)</CardTitle>
          <CardDescription>Leading metrics from all bids</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {status?.total_bids || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total Bids
              </div>
            </div>

            <div className="text-center p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {status?.leading_delivery_time
                  ? `${status.leading_delivery_time} days`
                  : "N/A"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Leading Delivery
              </div>
            </div>

            <div className="text-center p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {status?.leading_price != null
                  ? `$${Number(status.leading_price).toLocaleString()}`
                  : "N/A"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Leading Price
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bid Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {status?.vendor_bid ? "Update Your Bid" : "Submit Your Bid"}
          </CardTitle>
          <CardDescription>
            {!hasAuctionStarted()
              ? "Auction has not started yet - bidding will open soon"
              : isAuctionActive()
              ? "You can update your bid at any time during the auction"
              : "Auction has ended - bids are now locked"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery-time">Delivery Time (days) *</Label>
                <Input
                  id="delivery-time"
                  type="number"
                  step="0.1"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="e.g., 7"
                  required
                  disabled={!isAuctionActive() || submitting}
                />
              </div>

              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 15000"
                  required
                  disabled={!isAuctionActive() || submitting}
                />
              </div>
            </div>

            {showCompanyForm && (
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  name="company-name"
                  type="text"
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., ABC Company"
                  required
                />

                <Label htmlFor="contact-name">Contact Name *</Label>
                <Input
                  id="contact-name"
                  name="contact-name"
                  type="text"
                  autoComplete="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g., John Doe"
                  required
                />

                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  name="contact-phone"
                  type="text"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g., 123-456-7890"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isAuctionActive() || submitting}
            >
              {submitting
                ? "Submitting..."
                : status?.vendor_bid
                ? "Update Bid"
                : "Submit Bid"}
            </Button>

            {!hasAuctionStarted() && (
              <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                Auction has not started yet. Please wait for the start time.
              </p>
            )}

            {hasAuctionStarted() && !isAuctionActive() && (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                Auction has ended. No changes can be made.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}