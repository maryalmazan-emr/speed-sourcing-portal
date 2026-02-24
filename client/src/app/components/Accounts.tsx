// File: src/app/components/Accounts.tsx
"use client";

import { useState, useCallback } from "react";
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
import { ArrowLeft, RefreshCw } from "lucide-react";

import { apiGetAllAdmins } from "@/lib/api/api"; 
import { hasGlobalAccess, getRoleName } from "@/lib/adminAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  useRealTimeData,
  LastUpdateIndicator,
} from "@/lib/useRealTimeData";

interface AccountsProps {
  onBack: () => void;
  adminEmail: string;
  userRole: "product_owner" | "global_admin" | "internal_user" | "external_guest";
}

export function Accounts({
  onBack,
  adminEmail: _adminEmail, // reserved for SignalR user scoping
  userRole,
}: AccountsProps) {
  const hasGlobalView = hasGlobalAccess(userRole);
  const [searchTerm, setSearchTerm] = useState("");

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

  const fetchAdmins = useCallback(async (): Promise<Admin[]> => {
    return (await apiGetAllAdmins()) ?? [];
  }, []);

  const {
    data: adminsData,
    loading,
    lastUpdate,
    refresh,
  } = useRealTimeData<Admin[]>({
    fetchData: fetchAdmins,
    pollingInterval: 5000,
    storageKey: "admins",
    enablePolling: true,
    enableStorageWatch: true,
  });

  const admins = adminsData ?? [];

  const filteredAdmins = searchTerm
    ? admins.filter(a =>
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
              {filteredAdmins.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.company_name}</TableCell>
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
    </div>
  );
}
