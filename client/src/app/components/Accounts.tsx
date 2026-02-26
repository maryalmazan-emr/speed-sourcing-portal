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
  userRole:
    | "product_owner"
    | "global_admin"
    | "internal_user"
    | "external_guest";
}

export function Accounts({ adminEmail: _adminEmail, userRole }: AccountsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAdmins = useCallback(async (): Promise<Admin[]> => {
    return (await apiGetAllAdmins()) ?? [];
  }, []);

  const { data: adminsData, loading, lastUpdate, refresh } =
    useRealTimeData<Admin[]>({
      fetchData: fetchAdmins,
      pollingInterval: 5000,
      storageKey: "admins",
      enablePolling: true,
      enableStorageWatch: true,
    });

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
    return (
      <div className="container mx-auto px-4 py-8 text-gray-700 dark:text-gray-300">
        Loading accounts…
      </div>
    );
  }

  return (
    <div
      className="container mx-auto px-4 py-8"
      style={{ maxWidth: "1180px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          All Accounts
        </h1>

        <div className="flex items-center gap-4">
          <LastUpdateIndicator lastUpdate={lastUpdate} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search accounts…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6"
      />

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            Internal Accounts
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            All internal admins
          </CardDescription>
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
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {a.company_name}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    {a.email}
                  </TableCell>
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
              ))}

              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    No accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Viewing as: {getRoleName(userRole)}
      </div>
    </div>
  );
}
