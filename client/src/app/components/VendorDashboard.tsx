// File: client/src/app/components/VendorDashboard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/app/components/ui/checkbox";
import { Trophy, TrendingUp, Award, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { apiGetVendorRankInfo, apiSubmitBid } from "@/lib/api";
import { TypedConfirmDialog } from "@/app/components/TypedConfirmDialogue";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible"; // 

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
  vendor_bid?: VendorBid | null;
};

type DirtyState = {
  deliveryTime: boolean;
  price: boolean;
  companyName: boolean;
  contactName: boolean;
  contactPhone: boolean;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const formatDateTime = (value: any): string => {
  try {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

export function VendorDashboard({ auction, session, onLogout }: VendorDashboardProps) {
  const [deliveryTime, setDeliveryTime] = useState("");
  const [price, setPrice] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [status, setStatus] = useState<RankStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dirty, setDirty] = useState<DirtyState>({
    deliveryTime: false,
    price: false,
    companyName: false,
    contactName: false,
    contactPhone: false,
  });

  const [ackChecked, setAckChecked] = useState(false);
  const [ackTouched, setAckTouched] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    delivery_time_days: number;
    cost_per_unit: number;
    company_name: string;
    contact_name: string;
    contact_phone: string;
  } | null>(null);

  // Collapsible state
  const [isBidOpen, setIsBidOpen] = useState(true);
  const [isUpdateOpen, setIsUpdateOpen] = useState(true);

  const lastAppliedRef = useRef<string>("");

  const markDirty = (key: keyof DirtyState): void => {
    setDirty((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const resetDirty = (): void => {
    setDirty({
      deliveryTime: false,
      price: false,
      companyName: false,
      contactName: false,
      contactPhone: false,
    });
  };

  const startsAt = useMemo(() => new Date(auction?.starts_at), [auction?.starts_at]);
  const endsAt = useMemo(() => new Date(auction?.ends_at), [auction?.ends_at]);

  const hasStarted = (): boolean => {
    if (!auction?.starts_at) return false;
    return new Date() >= startsAt;
  };

  const hasEnded = (): boolean => {
    if (!auction?.ends_at) return false;
    return new Date() >= endsAt;
  };

  const isAuctionActive = (): boolean => {
    if (!auction) return false;
    if (auction.status !== "active") return false;
    const t = new Date();
    return t >= startsAt && t < endsAt;
  };

  const bidLocked = (): boolean => !isAuctionActive();

  useEffect(() => {
    if (!auction?.id || !session?.vendor_email) return;

    void loadStatus();
    const interval = setInterval(() => {
      void loadStatus();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.id, session?.vendor_email]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = (await apiGetVendorRankInfo(
        auction.id,
        session.vendor_email
      )) as RankStatus | null;

      setStatus(data ?? null);

      const vb = data?.vendor_bid ?? null;
      if (!vb) return;

      if (confirmOpen || submitting) return;

      const snapshot = JSON.stringify({
        d: vb.delivery_time_days ?? null,
        p: vb.cost_per_unit ?? null,
        c: vb.company_name ?? "",
        n: vb.contact_name ?? "",
        ph: vb.contact_phone ?? "",
      });

      if (snapshot === lastAppliedRef.current) return;

      if (!dirty.deliveryTime && typeof vb.delivery_time_days === "number") {
        setDeliveryTime(String(vb.delivery_time_days));
      }
      if (!dirty.price && typeof vb.cost_per_unit === "number") {
        setPrice(String(vb.cost_per_unit));
      }
      if (!dirty.companyName && vb.company_name) {
        setCompanyName(vb.company_name);
      }
      if (!dirty.contactName && vb.contact_name) {
        setContactName(vb.contact_name);
      }
      if (!dirty.contactPhone && vb.contact_phone) {
        setContactPhone(vb.contact_phone);
      }

      lastAppliedRef.current = snapshot;
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bid status");
    } finally {
      setLoading(false);
    }
  };

  const normalized = useMemo(() => {
    return {
      rank: status?.rank ?? null,
      hasBid: Boolean(status?.vendor_bid),
      vendorBid: status?.vendor_bid ?? null,
    };
  }, [status]);

  const getRankBadge = () => {
    if (normalized.rank == null) return null;
    if (normalized.rank === 1)
      return (
        <Badge className="bg-[#00573d] text-white border-0">
          <Trophy className="h-3 w-3 mr-1" />
          Leading
        </Badge>
      );
    if (normalized.rank === 2)
      return (
        <Badge className="bg-[#004b8d] text-white border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Close
        </Badge>
      );
    return (
      <Badge className="bg-[#75787c] text-white border-0">
        <Award className="h-3 w-3 mr-1" />
        Improve
      </Badge>
    );
  };

  const handleSubmitBid = async (e: FormEvent) => {
    e.preventDefault();

    if (bidLocked()) {
      toast.error("Bidding is locked. This auction is not accepting bid changes.");
      return;
    }

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

    if (!companyName.trim() || !contactName.trim()) {
      toast.error("Company name and contact name are required");
      return;
    }

    if (!ackChecked) {
      setAckTouched(true);
      toast.error("Please check the acknowledgement box before submitting.");
      return;
    }

    setPendingPayload({
      delivery_time_days: d,
      cost_per_unit: p,
      company_name: companyName.trim(),
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
    });
    setConfirmOpen(true);
  };

  const confirmSubmitBid = async (): Promise<void> => {
    if (!pendingPayload) return;
    if (!auction?.id || !session?.vendor_email) {
      toast.error("Session not loaded");
      return;
    }

    setSubmitting(true);
    try {
      await apiSubmitBid({
        auction_id: auction.id,
        vendor_email: session.vendor_email,
        vendor_company: pendingPayload.company_name,
        company_name: pendingPayload.company_name,
        contact_name: pendingPayload.contact_name,
        contact_phone: pendingPayload.contact_phone,
        delivery_time_days: pendingPayload.delivery_time_days,
        cost_per_unit: pendingPayload.cost_per_unit,
        notes: "",
      });

      toast.success(normalized.hasBid ? "Bid updated" : "Bid submitted");

      resetDirty();
      setAckChecked(false);
      setAckTouched(false);
      setPendingPayload(null);

      await loadStatus();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to submit bid");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const lockedMessage = !hasStarted()
    ? `Bidding opens at ${formatDateTime(auction?.starts_at)}`
    : hasEnded()
      ? `Bidding is locked. Auction ended at ${formatDateTime(auction?.ends_at)}`
      : auction?.status !== "active"
        ? "Bidding is locked. Auction is not in an active state."
        : "Bidding is locked.";

  // ✅ Icon-only chevron toggle button: NO border, NO hover background, NO focus ring
  const ChevronToggle = ({ open }: { open: boolean }) => (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={open ? "Collapse section" : "Expand section"}
      className={[
        "h-10 w-12",
        "hover:bg-transparent",
        "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
        "active:bg-transparent",
      ].join(" ")}
    >
      {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <TypedConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingPayload(null);
        }}
        title={normalized.hasBid ? "Confirm Bid Update" : "Confirm Bid Submission"}
        description={
          normalized.hasBid
            ? "This will update your existing bid. Type CONFIRM to proceed."
            : "This will submit your bid. Type CONFIRM to proceed."
        }
        confirmText="CONFIRM"
        confirmButtonText={normalized.hasBid ? "Update Bid" : "Submit Bid"}
        variant="default"
        onConfirm={confirmSubmitBid}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Logged in as {session.vendor_email}
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} type="button">
          Logout
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Auction Information</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Details for this sourcing event
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {bidLocked() && (
            <div className="flex items-start gap-2 p-3 rounded border bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Bid Locked</div>
                <div>{lockedMessage}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Title</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {auction?.title ?? "—"}
              </div>
            </div>

            <div>
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <div className="mt-1">
                <Badge
                  className={
                    isAuctionActive()
                      ? "bg-[#00573d] text-white border-0"
                      : "bg-muted text-muted-foreground border-border"
                  }
                >
                  {isAuctionActive() ? "Active" : "Not Accepting Bids"}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-gray-600 dark:text-gray-400">Start</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(auction?.starts_at)}
              </div>
            </div>

            <div>
              <span className="text-gray-600 dark:text-gray-400">End</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(auction?.ends_at)}
              </div>
            </div>

            {auction?.quantity ? (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Quantity</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {auction.quantity}
                </div>
              </div>
            ) : null}

            {auction?.delivery_location ? (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Delivery Location</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {auction.delivery_location}
                </div>
              </div>
            ) : null}
          </div>

          {auction?.description ? (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {auction.description}
            </div>
          ) : null}

          {auction?.notes ? (
            <div className="p-3 rounded border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Notes</div>
              <div className="text-sm text-gray-900 dark:text-white mt-1">
                {auction.notes}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {normalized.rank != null && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Your Rank</CardTitle>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                #{normalized.rank}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current placement
              </div>
            </div>

            <div>{getRankBadge()}</div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={isBidOpen} onOpenChange={setIsBidOpen}>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Your Bid Information</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  This section shows your submitted information.
                </CardDescription>
              </div>

              <CollapsibleTrigger asChild>
                <div>
                  <ChevronToggle open={isBidOpen} />
                </div>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              {normalized.vendorBid ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Delivery Time</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {typeof normalized.vendorBid.delivery_time_days === "number"
                        ? `${normalized.vendorBid.delivery_time_days} days`
                        : "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {typeof normalized.vendorBid.cost_per_unit === "number"
                        ? formatMoney(normalized.vendorBid.cost_per_unit)
                        : "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Company Name</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {normalized.vendorBid.company_name ?? "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Contact</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {normalized.vendorBid.contact_name ?? "—"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {normalized.vendorBid.contact_phone ?? "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No bid submitted yet.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">
                  {normalized.hasBid ? "Update Your Bid" : "Submit Your Bid"}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {bidLocked()
                    ? lockedMessage
                    : "You may update your bid while the auction is active"}
                </CardDescription>
              </div>

              <CollapsibleTrigger asChild>
                <div>
                  <ChevronToggle open={isUpdateOpen} />
                </div>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Delivery Time (days)</Label>
                    <Input
                      type="number"
                      value={deliveryTime}
                      onChange={(e) => {
                        markDirty("deliveryTime");
                        setDeliveryTime(e.target.value);
                      }}
                      disabled={bidLocked() || submitting}
                      required
                    />
                  </div>

                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => {
                        markDirty("price");
                        setPrice(e.target.value);
                      }}
                      disabled={bidLocked() || submitting}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      markDirty("companyName");
                      setCompanyName(e.target.value);
                    }}
                    disabled={bidLocked() || submitting}
                    required
                  />
                </div>

                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      markDirty("contactName");
                      setContactName(e.target.value);
                    }}
                    disabled={bidLocked() || submitting}
                    required
                  />
                </div>

                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => {
                      markDirty("contactPhone");
                      setContactPhone(e.target.value);
                    }}
                    disabled={bidLocked() || submitting}
                  />
                </div>

                <div
                  className={[
                    "flex items-start gap-2 rounded-md border p-3",
                    "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700",
                    ackTouched && !ackChecked ? "border-red-400 dark:border-red-600" : "",
                  ].join(" ")}
                >
                  <Checkbox
                    checked={ackChecked}
                    onCheckedChange={(v) => {
                      setAckTouched(true);
                      setAckChecked(Boolean(v));
                    }}
                    disabled={bidLocked() || submitting}
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Acknowledgement required
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      I confirm the information entered is accurate and I understand my bid is binding per the event terms.
                    </div>
                    {ackTouched && !ackChecked ? (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Please check this box before submitting.
                      </div>
                    ) : null}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#00573d] hover:bg-[#00462f] text-white"
                  disabled={bidLocked() || submitting || !ackChecked}
                >
                  {submitting ? "Submitting..." : normalized.hasBid ? "Update Bid" : "Submit Bid"}
                </Button>

                {loading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Refreshing…
                  </p>
                )}
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
