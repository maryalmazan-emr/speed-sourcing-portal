import { useState, useCallback } from "react";
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
  ArrowLeft,
  Copy,
  Trash2,
  Users,
  UserCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { apiGetInvites, apiGetAllAdmins } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { hasGlobalAccess, canDelete, getRoleName } from "@/lib/adminAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useRealTimeData, LastUpdateIndicator } from "@/lib/useRealTimeData";
interface AccountsProps {
  onBack: () => void;
  adminEmail: string;
  userRole: 'product_owner' | 'global_admin' | 'internal_user' | 'external_guest';
}

export function Accounts({ onBack, adminEmail, userRole }: AccountsProps) {
  const hasGlobalView = hasGlobalAccess(userRole);
  const canDeleteAccounts = canDelete(userRole);
  const [searchTerm, setSearchTerm] = useState('');

  if (!hasGlobalView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">
              Only Product Owner and Global Administrators can view all accounts.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Your role: {getRoleName(userRole)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchInvites = useCallback(async () => {
    return (await apiGetInvites()) ?? [];
  }, []);

  const fetchAdmins = useCallback(async () => {
    return (await apiGetAllAdmins()) ?? [];
  }, []);

  const {
    data: invitesData,
    loading: invitesLoading,
    lastUpdate,
    refresh,
  } = useRealTimeData({
    fetchData: fetchInvites,
    pollingInterval: 5000,
    storageKey: 'invites',
    enablePolling: true,
    enableStorageWatch: true,
  });

  const { data: adminsData, loading: adminsLoading } = useRealTimeData({
    fetchData: fetchAdmins,
    pollingInterval: 5000,
    storageKey: 'admins',
    enablePolling: true,
    enableStorageWatch: true,
  });

  const invites = invitesData ?? [];
  const admins = adminsData ?? [];
  const loading = invitesLoading || adminsLoading;

  const copyCode = async (code: string) => {
    if (!code) return toast.error('No code to copy');
    (await copyToClipboard(code))
      ? toast.success('Code copied')
      : toast.error('Failed to copy');
  };

  const copyInvite = async (invite: any) => {
    const message = `Hello,

You are invited to participate in an Emerson Speed Sourcing event.

Portal URL: ${window.location.origin}/?view=vendor
Email: ${invite.email}
Invite Code: ${invite.invite_code}

Emerson Procurement Team`;

    (await copyToClipboard(message))
      ? toast.success('Invite copied')
      : toast.error('Copy failed');
  };

  const filteredInvites = searchTerm
    ? invites.filter(i =>
        [i.email, i.invite_code, i.auction_title]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : invites;

  const filteredAdmins = searchTerm
    ? admins.filter(a =>
        [a.email, a.name, getRoleName(a.role)]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : admins;

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading accounts…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">All Accounts</h1>
        <div className="flex items-center gap-4">
          <LastUpdateIndicator lastUpdate={lastUpdate} />
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search accounts…"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="mb-6"
      />

      <Tabs defaultValue="internal">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="internal">
            <UserCircle className="h-4 w-4 mr-2" />
            Internal ({filteredAdmins.length})
          </TabsTrigger>
          <TabsTrigger value="external">
            <Users className="h-4 w-4 mr-2" />
            External ({filteredInvites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal">
          <Card>
            <CardHeader>
              <CardTitle>Internal Accounts</CardTitle>
              <CardDescription>All internal admins</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>
                        <Badge>{getRoleName(a.role)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external">
          <Card>
            <CardHeader>
              <CardTitle>External Vendors</CardTitle>
              <CardDescription>Invited vendors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Auction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map(i => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell className="font-mono">{i.invite_code}</TableCell>
                      <TableCell>{i.auction_title}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => copyCode(i.invite_code)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Code
                        </Button>
                        <Button size="sm" onClick={() => copyInvite(i)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Invite
                        </Button>
                        {canDeleteAccounts && (
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
