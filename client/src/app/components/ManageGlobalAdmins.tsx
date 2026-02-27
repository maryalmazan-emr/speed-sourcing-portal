// File: client/src/app/components/ManageGlobalAdmins.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { getAllAdminAccounts, createAdminAccount } from "@/lib/adminAuth";
import type { Admin } from "@/lib/backend";

interface ManageGlobalAdminsProps {
  onBack: () => void;
}

export function ManageGlobalAdmins({ onBack }: ManageGlobalAdminsProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAdmins = async (): Promise<void> => {
    setLoading(true);
    try {
      const allAdmins = await getAllAdminAccounts();
      const filteredAdmins = allAdmins.filter(
        (admin) => admin.role === "global_admin" || admin.role === "product_owner"
      );
      setAdmins(filteredAdmins);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error loading admins:", error);
      toast.error("Failed to load administrators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAdmin = async (): Promise<void> => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setCreating(true);
    try {
      await createAdminAccount(newEmail, newPassword, newName, "global_admin");
      toast.success(`Global Administrator ${newName} created successfully`);

      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setDialogOpen(false);

      await loadAdmins();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Error creating admin:", error);
      toast.error(error?.message || "Failed to create administrator");
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (role: Admin["role"]) => {
    if (role === "product_owner") {
      return <Badge className="bg-purple-600 text-white">Product Owner</Badge>;
    }
    return <Badge className="bg-blue-600 text-white">Global Administrator</Badge>;
  };

  const formatCreatedAt = (createdAt: any) => {
    try {
      if (!createdAt) return "—";
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const getDisplayName = (admin: any) => {
    // Defensive: your table was showing company_name, but some models use "name"
    return admin?.company_name || admin?.name || admin?.full_name || "—";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">
          Loading administrators...
        </div>
      </div>
    );
  }

  const globalAdmins = admins.filter((a) => a.role === "global_admin");
  const productOwners = admins.filter((a) => a.role === "product_owner");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack} type="button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <Shield className="h-6 w-6 text-purple-600" />
                Manage Global Administrators
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add and manage Global Administrator accounts
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#004b8d] hover:bg-[#003d73] text-white"
                type="button"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Global Administrator
              </Button>
            </DialogTrigger>

            {/* ✅ Tailwind-safe max width */}
            <DialogContent className="sm:max-w-130">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">
                  Add Global Administrator
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Create a new Global Administrator account.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleCreateAdmin()}
                  disabled={creating}
                  className="bg-[#004b8d] hover:bg-[#003d73] text-white"
                  type="button"
                >
                  {creating ? "Creating..." : "Create Administrator"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Product Owners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {productOwners.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Global Administrators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {globalAdmins.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Administrator Accounts
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              All Product Owner and Global Administrator accounts
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500 dark:text-gray-400"
                    >
                      No administrators found
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin: any) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {getDisplayName(admin)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {admin.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {formatCreatedAt(admin.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ManageGlobalAdmins;