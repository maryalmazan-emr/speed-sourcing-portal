// File: src/app/components/AllAuctions.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Crown, Search, Trash2 } from "lucide-react";
import { apiGetAuctions } from "@/lib/api/api";
import { hasGlobalAccess, canDelete, getRoleName } from "@/lib/adminAuth";
import { toast } from "sonner";

type UserRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

type AuctionLike = {
  id: string;
  title?: string | null;
  description?: string | null;
  group_site?: string | null;
  requestor?: string | null;
  created_by_email?: string | null;
  starts_at: string;
  ends_at: string;
  status?: string | null;
  winner_vendor_email?: string | null;
  product_details?: string | null;
};

interface AllAuctionsProps {
  onBack: () => void;
  onSelectAuction: (auction: AuctionLike) => void;
  adminEmail: string;
  userRole: UserRole;
}

export function AllAuctions({
  onBack,
  onSelectAuction,
  adminEmail,
  userRole,
}: AllAuctionsProps) {
  const hasGlobalView = hasGlobalAccess(userRole);
  const canDeleteAuctions = canDelete(userRole);

  const [auctions, setAuctions] = useState<AuctionLike[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "awarded">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAuctions();
  }, [hasGlobalView, adminEmail]);

  const loadAuctions = async (): Promise<void> => {
    setLoading(true);
    try {
      const allAuctions = (await apiGetAuctions()) as AuctionLike[];

      const visibleAuctions = allAuctions.filter(
        auction => hasGlobalView || auction.created_by_email === adminEmail
      );

      setAuctions(visibleAuctions);
    } catch (error) {
      console.error("Error loading auctions:", error);
      toast.error("Failed to load auctions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAuction = (auctionTitle: string, e: MouseEvent): void => {
    e.stopPropagation();

    if (!canDeleteAuctions) {
      toast.error("Only the Product Owner can delete auctions");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this auction?\n\n"${auctionTitle}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    toast.info(
      "Deletion is disabled. All auctions are maintained for audit trail compliance."
    );
  };

  const getShortId = (uuid: string): string => uuid.substring(0, 8).toUpperCase();

  const getStatusBadge = (auction: AuctionLike) => {
    const now = new Date();
    const startsAt = new Date(auction.starts_at);
    const endsAt = new Date(auction.ends_at);

    if (auction.winner_vendor_email) {
      return <Badge className="bg-[#00573d] text-white border-0">Awarded</Badge>;
    }

    if (startsAt > now) {
      return <Badge className="bg-[#9fa1a4] text-white border-0">Scheduled</Badge>;
    }

    if (auction.status === "manually_closed" || endsAt < now) {
      return <Badge className="bg-[#9fa1a4] text-white border-0">Closed</Badge>;
    }

    return <Badge className="bg-[#004b8d] text-white border-0">Active</Badge>;
  };

  const filteredAuctions = useMemo(() => {
    return auctions.filter(auction => {
      const now = new Date();

      if (filter === "awarded" && !auction.winner_vendor_email) return false;
      if (filter === "scheduled" && new Date(auction.starts_at) <= now) return false;

      if (
        filter === "active" &&
        (auction.status === "manually_closed" ||
          new Date(auction.ends_at) < now ||
          auction.winner_vendor_email ||
          new Date(auction.starts_at) > now)
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          getShortId(auction.id).toLowerCase().includes(q) ||
          auction.id.toLowerCase().includes(q) ||
          auction.title?.toLowerCase().includes(q) ||
          auction.description?.toLowerCase().includes(q) ||
          auction.group_site?.toLowerCase().includes(q) ||
          auction.requestor?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [auctions, filter, searchQuery]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading auctions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      <div className="mb-6">
        <Button variant="outline" onClick={onBack} className="mb-4" type="button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold">
          {hasGlobalView ? "All Auctions" : "My Auctions"}
        </h1>

        <p className="text-gray-600 mt-1">
          {hasGlobalView
            ? `${getRoleName(userRole)} — Viewing ALL auctions`
            : `Showing auctions created by ${adminEmail}`}
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ID, name, description, site, requestor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "active", "scheduled", "awarded"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            type="button"
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {filteredAuctions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No auctions found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAuctions.map(auction => (
            <Card
              key={auction.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectAuction(auction)}
            >
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        ID: {getShortId(auction.id)}
                      </span>
                      {auction.group_site && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {auction.group_site}
                        </span>
                      )}
                    </div>
                    <CardTitle>{auction.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {auction.description}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(auction)}
                    {canDeleteAuctions && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={e =>
                          handleDeleteAuction(auction.title ?? auction.id, e)
                        }
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {auction.requestor && (
                    <div>
                      <span className="text-gray-500">Requestor</span>
                      <div className="font-medium">{auction.requestor}</div>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-500">Starts</span>
                    <div className="font-medium">
                      {new Date(auction.starts_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">Ends</span>
                    <div className="font-medium">
                      {new Date(auction.ends_at).toLocaleDateString()}
                    </div>
                  </div>

                  {auction.product_details && (
                    <div>
                      <span className="text-gray-500">Part Numbers &amp; Qty</span>
                      <div className="font-medium">{auction.product_details}</div>
                    </div>
                  )}

                  {auction.winner_vendor_email && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Winner</span>
                      <div className="flex items-center gap-1 font-medium">
                        <Crown className="h-3 w-3 text-yellow-500" />
                        {auction.winner_vendor_email}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
