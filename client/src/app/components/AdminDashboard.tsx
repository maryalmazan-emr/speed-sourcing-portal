import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Copy, Crown, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiGetInvites, apiGetBids, apiUpdateAuction } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { SendNotificationDialog } from '@/app/components/SendNotificationDialog';
import { TypedConfirmDialog } from '@/app/components/TypedConfirmDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';

interface AdminDashboardProps {
  auction: any;
  onRefresh: () => void;
  adminRole?: 'product_owner' | 'global_admin' | 'internal_user' | 'external_guest';
}

export function AdminDashboard({ auction, onRefresh, adminRole }: AdminDashboardProps) {
  const [invites, setInvites] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isVendorsOpen, setIsVendorsOpen] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedWinnerEmail, setSelectedWinnerEmail] = useState<string | null>(null);

  const getShortId = (uuid: string) => uuid.substring(0, 8).toUpperCase();

  const loadData = useCallback(async () => {
    if (!auction?.id) return;

    try {
      const allInvites = await apiGetInvites(auction.id);
      const allBids = await apiGetBids(auction.id);

      const sortedBids = (allBids || []).sort((a: any, b: any) => {
        if (a.delivery_time !== b.delivery_time) return a.delivery_time - b.delivery_time;
        if (a.price !== b.price) return a.price - b.price;
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      });

      setInvites(allInvites || []);
      setBids(sortedBids);
    } finally {
      setLoading(false);
    }
  }, [auction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyCode = async (code: string) => {
    if (!code) return toast.error('No code to copy');

    if (await copyToClipboard(code)) {
      toast.success('Code copied');
    } else {
      toast.error('Failed to copy');
    }
  };

  const copyInvite = async (index: number) => {
    const invite = invites[index];
    if (!invite?.invite_code) return toast.error('Invalid invite');

    const message = `Hello,

You are invited to participate in a sourcing event hosted through the Emerson Speed Sourcing Portal for ${auction.title}

Portal URL: ${window.location.origin}/?view=vendor
Email: ${invite.email}
Invite Code: ${invite.invite_code}

Emerson Procurement Team`;

    if (await copyToClipboard(message)) {
      setCopiedIndex(index);
      toast.success('Invite copied');
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleSelectWinnerClick = (vendorEmail: string) => {
    setSelectedWinnerEmail(vendorEmail);
    setConfirmDialogOpen(true);
  };

  const selectWinner = async () => {
    if (!selectedWinnerEmail) return;

    await apiUpdateAuction(auction.id, {
      status: 'completed',
      winner_vendor_email: selectedWinnerEmail,
    } as any);

    toast.success('Winner selected and auction closed');
    setSelectedWinnerEmail(null);
    setConfirmDialogOpen(false);
    onRefresh();
  };

  if (loading) {
    return <div className="text-center py-8">Loading…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: '1180px' }}>
      {/* Auction Summary */}
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
          <CardDescription>{auction.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Bids */}
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
                  <TableHead>Delivery</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid, index) => (
                  <TableRow
                    key={bid.id}
                    className={index === 0 ? 'bg-gray-100 border-l-4 border-l-[#00573d]' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                        #{index + 1}
                      </div>
                    </TableCell>
                    <TableCell>{bid.company_name || '-'}</TableCell>
                    <TableCell>{bid.vendor_email}</TableCell>
                    <TableCell>{bid.delivery_time}</TableCell>
                    <TableCell>${bid.price?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <SendNotificationDialog
                          vendorEmail={bid.vendor_email}
                          vendorName={bid.company_name}
                          auctionId={auction.id}
                          adminRole={adminRole}
                        />
                        {index === 0 && auction.status === 'active' && !auction.winner_vendor_email && (
                          <Button size="sm" onClick={() => handleSelectWinnerClick(bid.vendor_email)}>
                            <Crown className="h-3 w-3 mr-1" />
                            Select Winner
                          </Button>
                        )}
                        {auction.winner_vendor_email === bid.vendor_email && (
                          <Badge>
                            <Crown className="h-3 w-3 mr-1" />
                            Winner
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invited Vendors */}
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
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell className="font-mono">{invite.invite_code}</TableCell>
                      <TableCell>
                        <Badge variant={invite.status === 'accessed' ? 'default' : 'secondary'}>
                          {invite.status}
                        </Badge>
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
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <TypedConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={selectWinner}
        title="Close Auction and Select Winner"
        description={
          selectedWinnerEmail
            ? `You are about to close this auction and award it to ${selectedWinnerEmail}. This action cannot be undone.`
            : 'You are about to close this auction.'
        }
        confirmText="Close"
        confirmButtonText="Close Auction"
        variant="destructive"
      />
    </div>
  );
}
