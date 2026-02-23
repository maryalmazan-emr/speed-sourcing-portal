// File: src/app/components/AdminDashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Copy, Crown, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import type { Bid, VendorInvite } from "@/lib/backend";
import { apiGetInvites, apiGetBids, apiUpdateAuction } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";

import { SendNotificationDialog } from "@/app/components/SendNotificationDialogue";
import { TypedConfirmDialog } from "@/app/components/TypedConfirmDialogue";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

type AuctionLike = {
  id: string;
  title: string;
  description?: string | null;
  status: "active" | "scheduled" | "completed" | string;
  winner_vendor_email?: string | null;
};

interface AdminDashboardProps {
  auction: AuctionLike | null;
  onRefresh: () => void;
  adminRole?: AdminRole;
  adminEmail?: string; // kept optional (no longer passed to apiUpdateAuction)
}

export function AdminDashboard({
  auction,
  onRefresh,
  adminRole,
}: AdminDashboardProps) {
  const [invites, setInvites] = useState<VendorInvite[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isVendorsOpen, setIsVendorsOpen] = useState(true);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedWinnerEmail, setSelectedWinnerEmail] = useState<string | null>(null);

  const getShortId = (uuid: string) => uuid.substring(0, 8).toUpperCase();

  const loadData = useCallback(async () => {
    if (!auction?.id) return;

    setLoading(true);
    try {
      const allInvites = await apiGetInvites(auction.id);
      const allBids = await apiGetBids(auction.id);

      const sortedBids = (allBids || []).sort((a: Bid, b: Bid) => {
        if (a.delivery_time_days !== b.delivery_time_days) {
          return a.delivery_time_days - b.delivery_time_days;
        }
        if (a.cost_per_unit !== b.cost_per_unit) {
          return a.cost_per_unit - b.cost_per_unit;
        }
        return (
          new Date(a.submitted_at).getTime() -
          new Date(b.submitted_at).getTime()
        );
      });

      setInvites((allInvites || []) as VendorInvite[]);
      setBids(sortedBids as Bid[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [auction?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyCode = useCallback(async (token: string) => {
    if (!token) {
      toast.error("No code to copy");
      return;
    }

    const ok = await copyToClipboard(token);
    if (ok) toast.success("Code copied");
    else toast.error("Failed to copy");
  }, []);

  const copyInvite = useCallback(
    async (index: number) => {
      const invite = invites[index];
      if (!invite?.invite_token) {
        toast.error("Invalid invite");
        return;
      }
      if (!auction?.title) {
        toast.error("Auction data missing");
        return;
      }

      const message = `Hello,

You are invited to participate in a sourcing event hosted through the Emerson Speed Sourcing Portal for ${auction.title}

Portal URL: ${window.location.origin}/?view=vendor
Email: ${invite.vendor_email}
Invite Code: ${invite.invite_token}

Emerson Procurement Team`;

      const ok = await copyToClipboard(message);
      if (ok) {
        setCopiedIndex(index);
        toast.success("Invite copied");
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        toast.error("Failed to copy");
      }
    },
    [invites, auction?.title]
  );

  const handleSelectWinnerClick = useCallback((vendorEmail: string) => {
    setSelectedWinnerEmail(vendorEmail);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmDialogChange = useCallback((open: boolean) => {
    setConfirmDialogOpen(open);
    if (!open) setSelectedWinnerEmail(null);
  }, []);

  const selectWinner = useCallback(async (): Promise<void> => {
    if (!auction?.id) {
      toast.error("Auction not loaded");
      return;
    }
    if (!selectedWinnerEmail) return;

    try {
      // ✅ FIX: apiUpdateAuction expects 2 arguments (auctionId, patch). [1](https://emerson-my.sharepoint.com/personal/mary_almazan_emerson_com/Documents/Downloads/src.zip)
      await apiUpdateAuction(auction.id, {
        status: "completed",
        winner_vendor_email: selectedWinnerEmail,
      } as any);

      toast.success("Winner selected and auction closed");
      setSelectedWinnerEmail(null);
      setConfirmDialogOpen(false);
      onRefresh();
      return;
    } catch (err) {
      console.error(err);
      toast.error("Failed to select winner");
      return;
    }
  }, [auction?.id, onRefresh, selectedWinnerEmail]);

  if (loading) {
    return <div className="text-center py-8">Loading…</div>;
  }

  if (!auction?.id) {
    return <div className="text-center py-8 text-gray-500">No auction selected.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      <TypedConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={handleConfirmDialogChange}
        title="Select Winner & Close Auction"
        description={
          selectedWinnerEmail
            ? `This will mark the auction as completed and award it to ${selectedWinnerEmail}. This action is final.`
            : "This will close the auction and set the winner."
        }
        confirmText="CONFIRM"
        confirmButtonText="Close Auction"
        variant="destructive"
        onConfirm={selectWinner}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
              ID: {getShortId(auction.id)}
            </span>
            {auction.winner_vendor_email ? (
              <Badge className="bg-[#00573d] text-white">Awarded</Badge>
            ) : (
              <Badge className="bg-[#004b8d] text-white">Active</Badge>
            )}
          </div>
          <CardTitle>{auction.title}</CardTitle>
          {auction.description ? <CardDescription>{auction.description}</CardDescription> : null}
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bids & Leaderboard ({bids.length})</CardTitle>
          <CardDescription>Sorted by delivery time, price, timestamp</CardDescription>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No bids yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Delivery (days)</TableHead>
                  <TableHead>Cost / Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid, index) => (
                  <TableRow
                    key={bid.id}
                    className={index === 0 ? "bg-gray-100 border-l-4 border-l-[#00573d]" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 ? <Crown className="h-4 w-4 text-yellow-500" /> : null}
                        #{index + 1}
                      </div>
                    </TableCell>
                    <TableCell>{bid.company_name || "-"}</TableCell>
                    <TableCell>{bid.vendor_email}</TableCell>
                    <TableCell>{bid.delivery_time_days}</TableCell>
                    <TableCell>
                      ${bid.cost_per_unit?.toLocaleString?.() ?? (bid as any).cost_per_unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <SendNotificationDialog
                          vendorEmail={bid.vendor_email}
                          vendorName={bid.company_name}
                          auctionId={auction.id}
                          adminRole={adminRole}
                        />

                        {index === 0 && auction.status === "active" && !auction.winner_vendor_email ? (
                          <Button size="sm" onClick={() => handleSelectWinnerClick(bid.vendor_email)}>
                            <Crown className="h-3 w-3 mr-1" />
                            Select Winner
                          </Button>
                        ) : null}

                        {auction.winner_vendor_email === bid.vendor_email ? (
                          <Badge>
                            <Crown className="h-3 w-3 mr-1" />
                            Winner
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Collapsible open={isVendorsOpen} onOpenChange={setIsVendorsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex w-full justify-between">
              <CardTitle>Invited Vendors ({invites.length})</CardTitle>
              {isVendorsOpen ? <ChevronUp /> : <ChevronDown />}
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {invites.map((invite, index) => (
                    <TableRow key={(invite as any).id ?? index}>
                      <TableCell>{(invite as any).vendor_email}</TableCell>
                      <TableCell className="font-mono">{(invite as any).invite_token}</TableCell>
                      <TableCell>
                        <Badge variant={(invite as any).status === "accessed" ? "default" : "secondary"}>
                          {(invite as any).status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode((invite as any).invite_token)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Code
                        </Button>

                        <Button size="sm" onClick={() => copyInvite(index)}>
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Full Invite
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                        No vendors invited yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
