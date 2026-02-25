"use client";

import { useEffect, useMemo, useState } from "react";
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
  apiGetVendorRankInfo,
  apiSubmitBid,
} from "@/lib/api";

interface VendorDashboardProps {
  auction: any;
  session: any;
  onLogout: () => void;
}

type VendorBid = {
  delivery_time_days?: number;
  cost_per_unit?: number;
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
};

type RankStatus = {
  rank?: number;
  total_bids?: number;
  leading_delivery_time_days?: number;
  leading_cost_per_unit?: number;
  vendor_bid?: VendorBid | null;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

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
  const [status, setStatus] = useState<RankStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  // ------------------ Load rank / leader ------------------
  useEffect(() => {
    if (!auction?.id || !session?.vendor_email) return;

    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.id, session?.vendor_email]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await apiGetVendorRankInfo(
        auction.id,
        session.vendor_email
      );

      setStatus(data ?? null);

      if (data?.vendor_bid) {
        const vb = data.vendor_bid;
        if (typeof vb.delivery_time_days === "number") {
          setDeliveryTime(String(vb.delivery_time_days));
        }
        if (typeof vb.cost_per_unit === "number") {
          setPrice(String(vb.cost_per_unit));
        }

        if (vb.company_name) {
          setCompanyName(vb.company_name);
          setContactName(vb.contact_name ?? "");
          setContactPhone(vb.contact_phone ?? "");
          setShowCompanyForm(false);
        } else {
          setShowCompanyForm(true);
        }
      } else {
        setShowCompanyForm(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bid status");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Normalized leader logic ------------------
  const normalized = useMemo(() => {
    const total = status?.total_bids ?? 0;

    let leadingDelivery = status?.leading_delivery_time_days ?? null;
    let leadingPrice = status?.leading_cost_per_unit ?? null;

    // ✅ Defensive fix: if only 1 bid, leader MUST be vendor bid
    if (total === 1 && status?.vendor_bid) {
      leadingDelivery = status.vendor_bid.delivery_time_days ?? leadingDelivery;
      leadingPrice = status.vendor_bid.cost_per_unit ?? leadingPrice;
    }

    return {
      rank: status?.rank ?? null,
      totalBids: total,
      leadingDelivery,
      leadingPrice,
      hasBid: Boolean(status?.vendor_bid),
    };
  }, [status]);

  // ------------------ Submit bid ------------------
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();

    const d = Number(deliveryTime);
    const p = Number(price);

    if (!Number.isFinite(d) || d <= 0) {
      toast.error("Delivery time must be greater than 0");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    if (showCompanyForm && (!companyName || !contactName)) {
      toast.error("Company name and contact name are required");
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
        contact_phone: contactPhone,
        delivery_time_days: d,
        cost_per_unit: p,
        notes: "",
      });

      toast.success("Bid submitted");
      setShowCompanyForm(false);
      await loadStatus();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------ Helpers ------------------
  const isAuctionActive = () => {
    if (auction.status !== "active") return false;
    const now = new Date();
    return (
      now >= new Date(auction.starts_at) &&
      now < new Date(auction.ends_at)
    );
  };

  const getRankBadge = () => {
    if (!normalized.rank) return null;
    if (normalized.rank === 1)
      return (
        <Badge className="bg-[#00573d] text-white">
          <Trophy className="h-3 w-3 mr-1" />
          Leading
        </Badge>
      );
    if (normalized.rank === 2)
      return (
        <Badge className="bg-[#004b8d] text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          Close
        </Badge>
      );
    return (
      <Badge className="bg-[#75787c] text-white">
        <Award className="h-3 w-3 mr-1" />
        Improve
      </Badge>
    );
  };

  // ------------------ UI ------------------
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
          <p className="text-sm text-gray-600">
            Logged in as {session.vendor_email}
          </p>
        </div>
        <Button variant="outline" onClick={onLogout}>
          Logout
        </Button>
      </div>

      {/* Rank */}
      {normalized.rank && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Rank</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">
                #{normalized.rank}
              </div>
              <div className="text-sm text-gray-600">
                out of {normalized.totalBids} bids
              </div>
            </div>
            {getRankBadge()}
          </CardContent>
        </Card>
      )}

      {/* Competitive stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Competitive Stats (Anonymous)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center bg-gray-50 p-4 rounded">
            <div className="text-2xl font-bold text-blue-600">
              {normalized.totalBids}
            </div>
            <div className="text-sm text-gray-600">Total Bids</div>
          </div>

          <div className="text-center bg-gray-50 p-4 rounded">
            <div className="text-2xl font-bold text-green-600">
              {normalized.leadingDelivery != null
                ? `${normalized.leadingDelivery} days`
                : "N/A"}
            </div>
            <div className="text-sm text-gray-600">Leading Delivery</div>
          </div>

          <div className="text-center bg-gray-50 p-4 rounded">
            <div className="text-2xl font-bold text-purple-600">
              {normalized.leadingPrice != null
                ? formatMoney(normalized.leadingPrice)
                : "N/A"}
            </div>
            <div className="text-sm text-gray-600">Leading Price</div>
          </div>
        </CardContent>
      </Card>

      {/* Bid form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {normalized.hasBid ? "Update Your Bid" : "Submit Your Bid"}
          </CardTitle>
          <CardDescription>
            {isAuctionActive()
              ? "You may update your bid while the auction is active"
              : "Auction is not currently accepting bids"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Time (days)</Label>
                <Input
                  type="number"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  disabled={!isAuctionActive() || submitting}
                  required
                />
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={!isAuctionActive() || submitting}
                  required
                />
              </div>
            </div>

            {showCompanyForm && (
              <>
                <Label>Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <Label>Contact Name</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
                <Label>Contact Phone</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isAuctionActive() || submitting}
            >
              {submitting ? "Submitting..." : "Submit Bid"}
            </Button>

            {loading && (
              <p className="text-xs text-gray-500 text-center">
                Updating leaderboard…
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}