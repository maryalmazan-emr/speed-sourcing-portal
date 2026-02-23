// File: src/app/components/ManagementDashboard.tsx

"use client";

import { useCallback, useMemo, useState } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Search,
  Copy,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { apiGetAuctions, apiGetInvites } from "@/lib/api/api";
import { getRoleName } from "@/lib/adminAuth";
import { toast } from "sonner";
import { useRealTimeData, LastUpdateIndicator } from "@/lib/useRealTimeData";

interface ManagementDashboardProps {
  userRole:
    | "product_owner"
    | "global_admin"
    | "internal_user"
    | "external_guest";
  onSelectAuction: (auction: any) => void;
}

export function ManagementDashboard({
  userRole,
  onSelectAuction,
}: ManagementDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // SECURITY
  if (userRole !== "product_owner" && userRole !== "global_admin") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">
              Only Product Owner and Global Administrators can access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Your role: {getRoleName(userRole)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ==================== AUCTIONS ==================== */
  /**
   * CRITICAL FIX:
   * We NEVER pass an adminId unless it is explicitly defined.
   * This guarantees the request is:
   *   GET /api/auctions
   * and NEVER:
   *   GET /api/auctions?adminId=undefined
   */
  const fetchAuctions = useCallback(async () => {
    const auctions = await apiGetAuctions();
    return Array.isArray(auctions) ? auctions : [];
  }, []);

  const {
    data: auctionsData,
    loading: auctionsLoading,
    lastUpdate: auctionsLastUpdate,
    refresh: refreshAuctions,
  } = useRealTimeData({
    fetchData: fetchAuctions,
    pollingInterval: 5000,
    storageKey: "auctions",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const auctions = auctionsData ?? [];

  /* ==================== INVITES (PER AUCTION) ==================== */
  const fetchAllInvites = useCallback(async () => {
    if (!auctions.length) return [];

    const results = await Promise.all(
      auctions.map(async (auction: any) => {
        try {
          const invites = await apiGetInvites(auction.id);
          return invites.map((invite: any) => ({
            ...invite,
            auction_title: auction.title,
            auction_id: auction.id,
          }));
        } catch {
          return [];
        }
      })
    );

    return results.flat();
  }, [auctions]);

  const {
    data: invitesData,
    loading: invitesLoading,
  } = useRealTimeData({
    fetchData: fetchAllInvites,
    pollingInterval: 5000,
    storageKey: "invites",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const invites = invitesData ?? [];
  const loading = auctionsLoading || invitesLoading;

  /* ==================== FILTERING ==================== */
  const filteredAuctions = useMemo(() => {
    if (!searchQuery.trim()) return auctions;
    const q = searchQuery.toLowerCase();
    return auctions.filter((a: any) =>
      [a.title, a.description, a.requestor, a.id]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    );
  }, [auctions, searchQuery]);

  const filteredInvites = useMemo(() => {
    if (!searchQuery.trim()) return invites;
    const q = searchQuery.toLowerCase();
    return invites.filter((i: any) =>
      [i.email, i.invite_code, i.auction_title]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    );
  }, [invites, searchQuery]);

  /* ==================== HELPERS ==================== */
  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Invite code copied");
  };

  const copyInvite = async (invite: any) => {
    await navigator.clipboard.writeText(
      `You're invited to participate in "${invite.auction_title}"

Email: ${invite.email}
Invite Code: ${invite.invite_code}`
    );
    toast.success("Full invitation copied");
  };

  const getShortId = (id: string) => id?.substring(0, 8);

  /* ==================== UI ==================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">
          Loading management dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Management Dashboard</h1>
          <Badge className="bg-[#00573d] text-white">
            {getRoleName(userRole)}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <LastUpdateIndicator lastUpdate={auctionsLastUpdate} />
          <Button size="sm" variant="outline" onClick={refreshAuctions}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Search auctions or invites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="auctions">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="auctions">
            Auctions ({filteredAuctions.length})
          </TabsTrigger>
          <TabsTrigger value="accounts">
            Invites ({filteredInvites.length})
          </TabsTrigger>
        </TabsList>

        {/* Auctions */}
        <TabsContent value="auctions">
          {filteredAuctions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                No auctions found
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAuctions.map((auction: any) => (
                <Card
                  key={auction.id}
                  className="cursor-pointer hover:shadow-lg"
                  onClick={() => onSelectAuction(auction)}
                >
                  <CardHeader>
                    <CardTitle>{auction.title}</CardTitle>
                    <CardDescription>
                      ID: {getShortId(auction.id)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invites */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>External Guest Invites</CardTitle>
              <CardDescription>
                All vendor access codes across all auctions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  No invites found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Invite Code</TableHead>
                      <TableHead>Auction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvites.map((invite: any) => (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell className="font-mono">
                          {invite.invite_code}
                        </TableCell>
                        <TableCell>{invite.auction_title}</TableCell>
                        <TableCell>
                          <Badge>{invite.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCode(invite.invite_code)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Code
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => copyInvite(invite)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Full Invite
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}