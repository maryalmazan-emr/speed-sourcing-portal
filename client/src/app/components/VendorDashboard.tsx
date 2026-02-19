// File: src/app/components/VendorDashboard.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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

type VendorStatus = {
  vendor_bid: any | null;
  rank: number | null;
  total_bids: number;
  leading_delivery_time: number | null;
  leading_price: number | null;
};

interface VendorDashboardProps {
  auction: any;
  session: any;
  onLogout: () => void;
}

export function VendorDashboard({ auction, session, onLogout }: VendorDashboardProps) {
  const [deliveryTime, setDeliveryTime] = useState("");
  const [price, setPrice] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [status, setStatus] = useState<VendorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const previousRankRef = useRef<number | null>(null);
  const auctionStartNotifiedRef = useRef(false);
  const auctionEndNotifiedRef = useRef(false);

  useEffect(() => {
    previousRankRef.current = null;
    auctionStartNotifiedRef.current = false;
    auctionEndNotifiedRef.current = false;
  }, [auction?.id]);

  const isAuctionActive = useCallback((): boolean => {
    if (!auction) return false;
    if (auction.status !== "active") return false;
    const now = new Date();
    const startsAt = new Date(auction.starts_at);
    const endsAt = new Date(auction.ends_at);
    return now >= startsAt && endsAt > now;
  }, [auction]);

  const hasAuctionStarted = useCallback((): boolean => {
    if (!auction) return false;
    return new Date() >= new Date(auction.starts_at);
  }, [auction]);

  const hasAuctionEnded = useCallback((): boolean => {
    if (!auction) return false;
    return new Date() > new Date(auction.ends_at);
  }, [auction]);

  const updateAccessTracking = useCallback(async (): Promise<void> => {
    try {
      if (session?.session_token) {
        await apiUpdateVendorAccess(session.session_token);
      }
    } catch (error) {
      console.error("[VendorDashboard] Error updating access tracking:", error);
    }
  }, [session?.session_token]);

  const loadStatus = useCallback(async (): Promise<void> => {
    if (!auction?.id || !session?.vendor_email) return;

    try {
      setLoading(true);

      const vendorBid = await apiGetVendorBid(auction.id, session.vendor_email);
      const rankInfo = await apiGetVendorRankInfo(auction.id, session.vendor_email);

      const data: VendorStatus = {
        vendor_bid: vendorBid ?? null,
        rank: rankInfo?.your_rank ?? null,
        total_bids: rankInfo?.total_participants ?? 0,
        leading_delivery_time: rankInfo?.leading_delivery_time ?? null,
        leading_price: rankInfo?.leading_cost ?? null,
      };

      const currentRank = data.rank;
      const prevRank = previousRankRef.current;

      if (
        isAuctionActive() &&
        prevRank !== null &&
        currentRank !== null &&
        prevRank !== currentRank
      ) {
        addNotification({
          vendor_email: session.vendor_email,
          auction_id: auction.id,
          type: "rank_change",
          title: currentRank < prevRank ? "Rank Improved" : "Rank Changed",
          message:
            currentRank < prevRank
              ? `Your position has improved from #${prevRank} to #${currentRank}.`
              : `Your position has changed from #${prevRank} to #${currentRank}. Consider updating your bid.`,
          old_rank: prevRank,
          new_rank: currentRank,
        });
      }

      if (currentRank !== null) previousRankRef.current = currentRank;

      setStatus(data);

      if (vendorBid) {
        setDeliveryTime(
          vendorBid.delivery_time_days != null
            ? vendorBid.delivery_time_days.toString()
            : ""
        );

        setPrice(
          vendorBid.cost_per_unit != null
            ? vendorBid.cost_per_unit.toString()
            : ""
        );

        if (vendorBid.company_name) {
          setCompanyName(vendorBid.company_name);
          setContactName(vendorBid.contact_name ?? "");
          setContactPhone(vendorBid.contact_phone ?? "");
          setShowCompanyForm(false);
        } else {
          setShowCompanyForm(true);
        }
      } else {
        setShowCompanyForm(true);
      }
    } catch (error) {
      console.error("[VendorDashboard] Error loading status:", error);
    } finally {
      setLoading(false);
    }
  }, [auction?.id, session?.vendor_email, isAuctionActive]);

  useEffect(() => {
    if (!auction || !session) return;

    void updateAccessTracking();
    void loadStatus();

    const interval = setInterval(() => {
      void loadStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [auction, session, updateAccessTracking, loadStatus]);

  const handleSubmitBid = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (showCompanyForm && (!companyName.trim() || !contactName.trim())) {
      toast.error("Please provide your company name and contact name");
      return;
    }

    const delivery = parseFloat(deliveryTime);
    const cost = parseFloat(price);

    if (!Number.isFinite(delivery) || delivery <= 0) {
      toast.error("Please enter a valid delivery time (days)");
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSubmitting(true);

    try {
      await apiSubmitBid({
        auction_id: auction.id,
        vendor_email: session.vendor_email,
        vendor_company: companyName,
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone || "",
        delivery_time_days: delivery,
        cost_per_unit: cost,
        notes: "",
      });

      toast.success("Bid submitted successfully!");
      setShowCompanyForm(false);
      await loadStatus();
    } catch (error: any) {
      console.error("[VendorDashboard] Bid submission error:", error);
      toast.error(error?.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const getRankBadge = () => {
    if (!status?.rank) return null;

    if (status.rank === 1) {
      return (
        <Badge className="bg-[#00573d] text-white border-0">
          <Trophy className="h-3 w-3 mr-1" />
          Leading
        </Badge>
      );
    }
    if (status.rank === 2) {
      return (
        <Badge className="bg-[#004b8d] text-white border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Close
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#75787c] text-white border-0">
        <Award className="h-3 w-3 mr-1" />
        Improve
      </Badge>
    );
  };

  useEffect(() => {
    if (!auction || !session?.vendor_email) return;

    const checkAuctionStatus = () => {
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
  }, [auction, session?.vendor_email, hasAuctionStarted, hasAuctionEnded]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Logged in as: {session?.vendor_email}
          </p>
          {loading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Refreshing…
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onLogout} type="button">
          Logout
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{auction?.title}</CardTitle>
          <CardDescription>{auction?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {auction?.product_details && (
              <div>
                <span className="text-gray-600 dark:text-gray-300">
                  Part Numbers &amp; Qty:
                </span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {auction.product_details}
                </div>
              </div>
            )}

            {auction?.delivery_location && (
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
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <div className="mt-1">
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

          {auction?.notes && (
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

      {status?.rank != null && status.rank > 0 && (
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Competitive Stats (Anonymous)</CardTitle>
          <CardDescription>Leading metrics from all bids</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {status?.total_bids ?? 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total Bids
              </div>
            </div>

            <div className="text-center p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {status?.leading_delivery_time != null
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
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