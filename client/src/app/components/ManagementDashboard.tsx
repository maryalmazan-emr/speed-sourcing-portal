// File: src/app/components/ManagementDashboard.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Search, Trash2, Copy, AlertCircle, RefreshCw, Users } from "lucide-react";
import { apiGetAuctions, apiGetInvites } from "@/lib/api";
import { getRoleName, canDelete } from "@/lib/adminAuth";
import { toast } from "sonner";
import { useRealTimeData, LastUpdateIndicator } from "@/lib/useRealTimeData";

interface ManagementDashboardProps {
  // NOTE: removed adminEmail/adminPassword because they were unused and causing TS warnings
  userRole: "product_owner" | "global_admin" | "internal_user" | "external_guest";
  onSelectAuction: (auction: any) => void;
}

export function ManagementDashboard({ userRole, onSelectAuction }: ManagementDashboardProps) {
  const canDeleteItems = canDelete(userRole);

  const [searchQuery, setSearchQuery] = useState("");

  // SECURITY: Only Product Owner and Global Admin
  if (userRole !== "product_owner" && userRole !== "global_admin") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Only Product Owner and Global Administrators can access the Management Dashboard.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Your role: {getRoleName(userRole)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchAuctions = useCallback(async () => {
    const result = await apiGetAuctions();
    return result || [];
  }, []);

  const fetchInvites = useCallback(async () => {
    const result = await apiGetInvites();
    return result || [];
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

  const { data: invitesData, loading: invitesLoading } = useRealTimeData({
    fetchData: fetchInvites,
    pollingInterval: 5000,
    storageKey: "invites",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const auctions = auctionsData || [];
  const invites = invitesData || [];
  const loading = auctionsLoading || invitesLoading;

  // Sort by created_at desc if present
  const sortedAuctions = [...auctions].sort(
    (a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const sortedInvites = [...invites].sort(
    (a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const filteredAuctions = sortedAuctions.filter((auction: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      auction.title?.toLowerCase().includes(q) ||
      auction.description?.toLowerCase().includes(q) ||
      auction.requestor?.toLowerCase().includes(q) ||
      auction.id?.toLowerCase().includes(q)
    );
  });

  const filteredInvites = sortedInvites.filter((invite: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      invite.email?.toLowerCase().includes(q) ||
      invite.invite_code?.toLowerCase().includes(q) ||
      invite.auction_title?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    // no-op placeholder (keeps file structure consistent if you later add stats back)
  }, []);

  const handleDeleteAuction = async (auctionTitle: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();

    if (!canDeleteItems) {
      toast.error("Only the Product Owner can delete auctions");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this auction?\n\n"${auctionTitle}"\n\nThis action cannot be undone and will remove all associated data.`
    );
    if (!confirmed) return;

    toast.info("Deletion is disabled. All auctions are maintained for audit trail compliance.");
  };

  const handleDeleteAccount = async (email: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();

    if (!canDeleteItems) {
      toast.error("Only the Product Owner can delete accounts");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this account?\n\nExternal Guest: ${email}\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    toast.info("Deletion is disabled. All accounts are maintained for audit trail compliance.");
  };

  const copyCode = async (code: string): Promise<void> => {
    if (!code) {
      toast.error("No code to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const copyInvite = async (invite: any): Promise<void> => {
    if (!invite || !invite.invite_code) {
      toast.error("Invalid invite data");
      return;
    }

    const inviteText = `You're invited to participate in the Speed Sourcing auction: "${invite.auction_title}"

Your access details:
Email: ${invite.email}
Invite Code: ${invite.invite_code}

Please log in at the vendor portal to submit your bid.`;

    try {
      await navigator.clipboard.writeText(inviteText);
      toast.success("Full invitation copied!");
    } catch {
      toast.error("Failed to copy invitation");
    }
  };

  const getShortId = (id: string) => (id ? id.substring(0, 8) : "");

  const getStatusBadge = (auction: any) => {
    const now = new Date();
    const start = new Date(auction.starts_at);
    const end = new Date(auction.ends_at);

    if (auction.winner_vendor_email) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Awarded</Badge>;
    }
    if (now < start) {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    if (now >= start && now <= end) {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    }
    return <Badge variant="outline">Closed</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading management dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Management Dashboard
            </h1>
            <Badge className="bg-[#00573d] text-white">{getRoleName(userRole)}</Badge>
          </div>

          <div className="flex items-center gap-4">
            <LastUpdateIndicator lastUpdate={auctionsLastUpdate} />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAuctions}
              className="gap-2"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Now
            </Button>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400">
          Full oversight of all auctions and External Guest accounts across the platform • Auto-updates every 5 seconds
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search auctions, accounts, codes, or requestors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="auctions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="auctions">
            All Auctions ({filteredAuctions.length})
          </TabsTrigger>
          <TabsTrigger value="accounts">
            All Accounts ({filteredInvites.length})
          </TabsTrigger>
        </TabsList>

        {/* Auctions Tab */}
        <TabsContent value="auctions" className="space-y-4">
          {filteredAuctions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {searchQuery ? "No auctions match your search" : "No auctions found"}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAuctions.map((auction: any) => (
                <Card
                  key={auction.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onSelectAuction(auction)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-2 py-1 rounded">
                            ID: {getShortId(auction.id)}
                          </span>

                          {auction.group_site && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-2 py-1 rounded">
                              {auction.group_site}
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-xl">{auction.title}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {auction.description}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(auction)}
                        {canDeleteItems && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleDeleteAuction(auction.title, e)}
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
                          <div className="font-medium">{auction.winner_vendor_email}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>External Guest Accounts ({filteredInvites.length})</CardTitle>
              <CardDescription>
                All External Guest invitations and access codes across all auctions
              </CardDescription>
            </CardHeader>

            <CardContent>
              {filteredInvites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  {searchQuery ? "No accounts match your search" : "No accounts found"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Invite Code</TableHead>
                      <TableHead>Auction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Accessed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredInvites.map((invite: any) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell className="font-mono text-sm">{invite.invite_code}</TableCell>
                        <TableCell className="max-w-xs truncate">{invite.auction_title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invite.status === "accessed"
                                ? "default"
                                : invite.status === "sent"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {invite.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {invite.accessed_at ? new Date(invite.accessed_at).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCode(invite.invite_code)}
                            type="button"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Code
                          </Button>

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => copyInvite(invite)}
                            type="button"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Full Invite
                          </Button>

                          {canDeleteItems && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteAccount(invite.email, e)}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
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
