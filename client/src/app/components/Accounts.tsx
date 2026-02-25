// File: client/src/app/components/Accounts.tsx

"use client";

import { useCallback, useState } from "react";
import type { Admin } from "@/lib/backend";

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
import { RefreshCw } from "lucide-react";

import { apiGetAllAdmins } from "@/lib/api/api";
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

interface AccountsProps {
  adminEmail: string;
  userRole: "product_owner" | "global_admin" | "internal_user" | "external_guest";
}

export function Accounts({ adminEmail: _adminEmail, userRole }: AccountsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAdmins = useCallback(async (): Promise<Admin[]> => {
    return (await apiGetAllAdmins()) ?? [];
  }, []);

  const { data: adminsData, loading, lastUpdate, refresh } = useRealTimeData<Admin[]>(
    {
      fetchData: fetchAdmins,
      pollingInterval: 5000,
      storageKey: "admins",
      enablePolling: true,
      enableStorageWatch: true,
    }
  );

  const admins = adminsData ?? [];

  const filteredAdmins = searchTerm
    ? admins.filter((a) =>
        [a.company_name, a.email, getRoleName(a.role)]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : admins;

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading accounts…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">All Accounts</h1>
        <div className="flex items-center gap-4">
          <LastUpdateIndicator lastUpdate={lastUpdate} />
          <Button size="sm" variant="outline" onClick={() => void refresh()} type="button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search accounts…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle>Internal Accounts</CardTitle>
          <CardDescription>All internal admins</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.company_name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>
                    <Badge>{getRoleName(a.role)}</Badge>
                  </TableCell>
                </TableRow>
              ))}

              {filteredAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 text-xs text-gray-500">Viewing as: {getRoleName(userRole)}</div>
    </div>
  );
}