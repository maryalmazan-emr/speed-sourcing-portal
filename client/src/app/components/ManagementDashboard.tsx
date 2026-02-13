import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Crown, Search, Trash2, Copy, Calendar, Users, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { apiGetAuctions, apiGetInvites } from '@/lib/api';
import { getRoleName, canDelete } from '@/lib/adminAuth';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { useRealTimeData, LastUpdateIndicator } from '@/lib/useRealTimeData.tsx';

interface ManagementDashboardProps {
  adminEmail: string;
  adminPassword: string;
  userRole: 'product_owner' | 'global_admin' | 'internal_user' | 'external_guest';
  onSelectAuction: (auction: any) => void;
}

export function ManagementDashboard({ adminEmail, adminPassword, userRole, onSelectAuction }: ManagementDashboardProps) {
  // SECURITY: Only Product Owner and Global Admin can access Management Dashboard
  const canDeleteItems = canDelete(userRole);
  const [searchQuery, setSearchQuery] = useState('');
  const [auctionFilter, setAuctionFilter] = useState<'all' | 'active' | 'scheduled' | 'awarded'>('all');
  const [stats, setStats] = useState({
    totalAuctions: 0,
    activeAuctions: 0,
    totalGuests: 0,
    awardedAuctions: 0
  });

  // SECURITY CHECK: Block access for non-global roles
  if (userRole !== 'product_owner' && userRole !== 'global_admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
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

  // REAL-TIME DATA: Auto-refresh every 5 seconds + cross-tab sync
  const fetchAuctions = useCallback(async () => {
    const result = await apiGetAuctions();
    return result || [];
  }, []);

  const fetchInvites = useCallback(async () => {
    const result = await apiGetInvites();
    return result || [];
  }, []);

  const { data: auctionsData, loading: auctionsLoading, lastUpdate: auctionsLastUpdate, refresh: refreshAuctions } = useRealTimeData({
    fetchData: fetchAuctions,
    pollingInterval: 5000,
    storageKey: 'auctions',
    enablePolling: true,
    enableStorageWatch: true
  });

  const { data: invitesData, loading: invitesLoading, lastUpdate: invitesLastUpdate } = useRealTimeData({
    fetchData: fetchInvites,
    pollingInterval: 5000,
    storageKey: 'invites',
    enablePolling: true,
    enableStorageWatch: true
  });

  const auctions = auctionsData || [];
  const invites = invitesData || [];
  const loading = auctionsLoading || invitesLoading;

  // Calculate stats whenever data changes
  useEffect(() => {
    if (!auctions.length) return;

    // Calculate stats
    const now = new Date();
    
    const active = auctions.filter((a: any) => {
      const start = new Date(a.starts_at);
      const end = new Date(a.ends_at);
      return now >= start && now <= end && !a.winner_vendor_email;
    }).length;

    const awarded = auctions.filter((a: any) => a.winner_vendor_email).length;

    setStats({
      totalAuctions: auctions.length,
      activeAuctions: active,
      totalGuests: invites.length,
      awardedAuctions: awarded
    });
  }, [auctions, invites]);

  const handleDeleteAuction = async (auctionId: string, auctionTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canDeleteItems) {
      toast.error('Only the Product Owner can delete auctions');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this auction?\n\n"${auctionTitle}"\n\nThis action cannot be undone and will remove all associated data.`
    );

    if (!confirmed) return;

    // Deletion disabled - audit trail requirement
    toast.info('Deletion is disabled. All auctions are maintained for audit trail compliance.');
  };

  const handleDeleteAccount = async (inviteId: string, email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canDeleteItems) {
      toast.error('Only the Product Owner can delete accounts');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this account?\n\nExternal Guest: ${email}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    // Deletion disabled - audit trail requirement
    toast.info('Deletion is disabled. All accounts are maintained for audit trail compliance.');
  };

  const copyCode = async (code: string) => {
    if (!code) {
      toast.error('No code to copy');
      return;
    }
    const success = await copyToClipboard(code);
    if (success) {
      toast.success('Invite code copied!');
    } else {
      toast.error('Failed to copy code');
    }
  };

  const copyInvite = async (invite: any) => {
    if (!invite || !invite.invite_code) {
      toast.error('Invalid invite data');
      return;
    }
    const inviteText = `You're invited to participate in the Speed Sourcing auction: "${invite.auction_title}"

Your access details:
Email: ${invite.email}
Invite Code: ${invite.invite_code}

Please log in at the vendor portal to submit your bid.`;
    
    const success = await copyToClipboard(inviteText);
    if (success) {
      toast.success('Full invitation copied!');
    } else {
      toast.error('Failed to copy invitation');
    }
  };

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

  const getShortId = (id: string) => id.substring(0, 8);

  const filteredAuctions = auctions
    .filter(auction => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          auction.title?.toLowerCase().includes(query) ||
          auction.description?.toLowerCase().includes(query) ||
          auction.requestor?.toLowerCase().includes(query) ||
          auction.id.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(auction => {
      const now = new Date();
      const start = new Date(auction.starts_at);
      const end = new Date(auction.ends_at);

      if (auctionFilter === 'active') {
        return now >= start && now <= end && !auction.winner_vendor_email;
      } else if (auctionFilter === 'scheduled') {
        return now < start;
      } else if (auctionFilter === 'awarded') {
        return !!auction.winner_vendor_email;
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const filteredInvites = invites
    .filter(invite => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          invite.email?.toLowerCase().includes(query) ||
          invite.invite_code?.toLowerCase().includes(query) ||
          invite.auction_title?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Management Dashboard</h1>
            <Badge className="bg-[#00573d] text-white">{getRoleName(userRole)}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <LastUpdateIndicator lastUpdate={auctionsLastUpdate} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAuctions()}
              className="gap-2"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Auctions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAuctions}</p>
              </div>
              <Calendar className="h-8 w-8 text-[#00573d]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Now
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.activeAuctions}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Awarded
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.awardedAuctions}
                </p>
              </div>
              <Crown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  External Guests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalGuests}
                </p>
              </div>
              <Users className="h-8 w-8 text-[#00573d]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={auctionFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuctionFilter("all")}
            >
              All ({auctions.length})
            </Button>

            <Button
              variant={auctionFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuctionFilter("active")}
            >
              Active
            </Button>

            <Button
              variant={auctionFilter === "scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuctionFilter("scheduled")}
            >
              Scheduled
            </Button>

            <Button
              variant={auctionFilter === "awarded" ? "default" : "outline"}
              size="sm"
              onClick={() => setAuctionFilter("awarded")}
            >
              Awarded
            </Button>
          </div>

          {/* Auctions List */}
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
                            onClick={(e) => handleDeleteAuction(auction.id, auction.title, e)}
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
                          <span className="text-white">Requestor:</span>
                          <div className="font-medium text-white">{auction.requestor}</div>
                        </div>
                      )}

                      <div>
                        <span className="text-white">Started:</span>
                        <div className="font-medium text-white">
                          {new Date(auction.starts_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div>
                        <span className="text-white">Ends:</span>
                        <div className="font-medium text-white">
                          {new Date(auction.ends_at).toLocaleDateString()}
                        </div>
                      </div>

                      {auction.product_details && (
                        <div>
                          <span className="text-white">Part Numbers & Qty:</span>
                          <div className="font-medium text-white">{auction.product_details}</div>
                        </div>
                      )}

                      {auction.winner_vendor_email && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Winner:</span>
                          <div className="font-medium flex items-center gap-1">
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
        </TabsContent>
        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>
                External Guest Accounts ({filteredInvites.length})
              </CardTitle>
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
                        <TableCell className="font-medium">
                          {invite.email}
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {invite.invite_code}
                        </TableCell>

                        <TableCell className="max-w-xs truncate">
                          {invite.auction_title}
                        </TableCell>

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
                          {invite.accessed_at
                            ? new Date(invite.accessed_at).toLocaleString()
                            : "-"}
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
                            variant="default"
                            onClick={() => copyInvite(invite)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Full Invite
                          </Button>

                          {canDeleteItems && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) =>
                                handleDeleteAccount(invite.id, invite.email, e)
                              }
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

