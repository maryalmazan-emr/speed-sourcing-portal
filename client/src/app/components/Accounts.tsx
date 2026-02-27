// File: client/src/app/components/Accounts.tsx
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
import { RefreshCw, X } from "lucide-react";

import { apiGetAuctions, getAccounts } from "@/lib/api";
import { getRoleName } from "@/lib/adminAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { LastUpdateIndicator, useRealTimeData } from "@/lib/useRealTimeData";

type UserRole = "product_owner" | "global_admin" | "internal_user" | "external_guest";
type RoleFilter = "all" | UserRole;

type AccountRow = {
  id?: string;
  email: string;
  company_name?: string | null;
  role: UserRole;
};

type AuctionLike = {
  id: string;
  title?: string | null;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  status?: string | null;
  winner_vendor_email?: string | null;
  created_by_email?: string | null;
};

interface AccountsProps {
  adminEmail: string;
  userRole: UserRole;
  onSelectAuction?: (auction: any) => void;
}

export function Accounts({ adminEmail: _adminEmail, userRole, onSelectAuction }: AccountsProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedUser, setSelectedUser] = useState<AccountRow | null>(null);

  const fetchAccounts = useCallback(async (): Promise<AccountRow[]> => {
    const rows = (await getAccounts()) as AccountRow[] | null | undefined;
    return Array.isArray(rows) ? rows : [];
  }, []);

  const {
    data: accountsData,
    loading: accountsLoading,
    lastUpdate: accountsLastUpdate,
    refresh: refreshAccounts,
  } = useRealTimeData<AccountRow[]>({
    fetchData: fetchAccounts,
    pollingInterval: 5000,
    storageKey: "all_accounts",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const fetchAuctions = useCallback(async (): Promise<AuctionLike[]> => {
    const data = (await apiGetAuctions()) as AuctionLike[];
    return Array.isArray(data) ? data : [];
  }, []);

  const {
    data: auctionsData,
    loading: auctionsLoading,
    lastUpdate: auctionsLastUpdate,
    refresh: refreshAuctions,
  } = useRealTimeData<AuctionLike[]>({
    fetchData: fetchAuctions,
    pollingInterval: 5000,
    storageKey: "accounts_auctions",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const accounts = accountsData ?? [];
  const auctions = auctionsData ?? [];

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (!q) return true;
      return (
        a.email.toLowerCase().includes(q) ||
        (a.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [accounts, roleFilter, search]);

  const selectedAuctions = useMemo(() => {
    if (!selectedUser?.email) return [];
    const email = selectedUser.email.toLowerCase();
    return auctions
      .filter((a) => (a.created_by_email ?? "").toLowerCase() === email)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [auctions, selectedUser]);

  const loading = accountsLoading || auctionsLoading;

  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = {
      external_guest: 0,
      internal_user: 0,
      global_admin: 0,
      product_owner: 0,
    };
    for (const a of accounts) {
      counts[a.role] += 1;
    }
    return counts;
  }, [accounts]);

  const handleRefresh = () => {
    void refreshAccounts();
    void refreshAuctions();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-gray-700 dark:text-gray-300">
        Loading accounts…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Accounts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Filter internal users vs vendors, and search by name or email
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <LastUpdateIndicator lastUpdate={accountsLastUpdate} />
            {auctionsLastUpdate ? (
              <div className="text-[10px] text-gray-400">
                Auctions updated {auctionsLastUpdate.toLocaleTimeString()}
              </div>
            ) : null}
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} type="button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={roleFilter === "all" ? "default" : "outline"}
              onClick={() => setRoleFilter("all")}
              type="button"
            >
              Select All Filtered
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "external_guest" ? "default" : "outline"}
              onClick={() => setRoleFilter("external_guest")}
              type="button"
            >
              All External Guests ({roleCounts.external_guest})
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "internal_user" ? "default" : "outline"}
              onClick={() => setRoleFilter("internal_user")}
              type="button"
            >
              All Internal Users ({roleCounts.internal_user})
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "global_admin" ? "default" : "outline"}
              onClick={() => setRoleFilter("global_admin")}
              type="button"
            >
              All Global Admins ({roleCounts.global_admin})
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "product_owner" ? "default" : "outline"}
              onClick={() => setRoleFilter("product_owner")}
              type="button"
            >
              All Product Owners ({roleCounts.product_owner})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="external_guest">External Guest</option>
              <option value="internal_user">Internal User</option>
              <option value="global_admin">Global Admin</option>
              <option value="product_owner">Product Owner</option>
            </select>

            {selectedUser ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUser(null)}
                type="button"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selected
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Accounts</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Click an internal employee to view auctions they have created
          </CardDescription>
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
              {filteredAccounts.map((a) => {
                const isSelected = selectedUser?.email === a.email && selectedUser?.role === a.role;
                return (
                  <TableRow
                    key={`${a.email}-${a.role}`}
                    className={`cursor-pointer ${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                    onClick={() => setSelectedUser(a)}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {a.company_name ?? a.email}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{a.email}</TableCell>
                    <TableCell>
                      <Badge
                        className="
                          bg-gray-100 text-gray-900 border border-gray-200
                          dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                        "
                      >
                        {getRoleName(a.role)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No matching accounts found
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Auctions Created by {selectedUser.company_name ?? selectedUser.email}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {selectedUser.email} • Total: {selectedAuctions.length}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {selectedAuctions.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No auctions found for this user
              </div>
            ) : (
              <div className="grid gap-3">
                {selectedAuctions.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-md border p-4 bg-white dark:bg-gray-900 hover:shadow-sm cursor-pointer"
                    onClick={() => onSelectAuction?.(a)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onSelectAuction?.(a);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {a.title ?? "Untitled Auction"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ID: {a.id.substring(0, 8).toUpperCase()} • Starts:{" "}
                          {new Date(a.starts_at).toLocaleString()} • Ends:{" "}
                          {new Date(a.ends_at).toLocaleString()}
                        </div>
                      </div>

                      <Badge
                        className="
                          bg-gray-100 text-gray-900 border border-gray-200
                          dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                        "
                      >
                        {a.winner_vendor_email ? "Awarded" : a.status ?? "Active"}
                      </Badge>
                    </div>

                    {a.description ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                        {a.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Viewing as: {getRoleName(userRole)}
      </div>
    </div>
  );
}