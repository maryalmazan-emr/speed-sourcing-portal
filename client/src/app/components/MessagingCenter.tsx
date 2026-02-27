// File: client/src/app/components/MessagingCenter.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { MessageSquare, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/lib/notifications";
import { Checkbox } from "@/app/components/ui/checkbox";

// ✅ No /api/admins call. Admins come from local auth storage; vendors from invites.
import { getAllAdminAccounts } from "@/lib/adminAuth";
import { apiGetInvites } from "@/lib/api";

type AdminRole = "product_owner" | "global_admin";

// ✅ Lightweight type for THIS screen (do not use backend Account type which requires created_at, etc.)
type MessagingAccountRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

type MessagingAccount = {
  id?: string;
  email: string;
  company_name?: string | null;
  role: MessagingAccountRole;
};

type RoleFilter = "all" | MessagingAccountRole;

interface MessagingCenterProps {
  onBack: () => void; // kept for compatibility with App.tsx; UI button removed per request
  adminRole: AdminRole;
}

export function MessagingCenter({ onBack, adminRole }: MessagingCenterProps) {
  // ✅ keep onBack "used" without changing UI (prevents strict noUnusedParameters configs)
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  // ✅ keep adminRole "used" without showing a badge (no behavior change)
  const sender =
    adminRole === "product_owner"
      ? "Emerson Procurement Team"
      : "Emerson Procurement Team";

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [accounts, setAccounts] = useState<MessagingAccount[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [filterRole, setFilterRole] = useState<RoleFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void loadAccounts();
  }, []);

  const loadAccounts = async (): Promise<void> => {
    try {
      // ✅ Admins from local (no /api/admins)
      const admins = await getAllAdminAccounts();

      const adminAccounts: MessagingAccount[] = (admins ?? [])
        .map((a: any) => ({
          id: String(a.id ?? a.email ?? ""),
          email: String(a.email ?? "").trim(),
          company_name: (a.company_name ?? a.name ?? a.email ?? "") as string,
          role: (a.role ?? "internal_user") as MessagingAccountRole,
        }))
        .filter((a) => !!a.email);

      // ✅ Vendors from invites endpoint (no /api/admins)
      const invites = await apiGetInvites();

      const vendorAccounts: MessagingAccount[] = (invites ?? [])
        .map((i: any) => ({
          id: String(i.id ?? `${i.vendor_email ?? i.email ?? ""}-invite`),
          email: String(i.vendor_email ?? i.email ?? "").trim(),
          company_name: (i.vendor_company ?? "External Guest") as string,
          role: "external_guest" as const,
        }))
        .filter((v) => !!v.email);

      // ✅ Deduplicate by email+role
      const seen = new Set<string>();
      const combined: MessagingAccount[] = [];

      for (const a of [...adminAccounts, ...vendorAccounts]) {
        const key = `${a.email.toLowerCase()}|${a.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(a);
      }

      setAccounts(combined);
    } catch (err) {
      console.error("[MessagingCenter] Failed to load accounts:", err);
      toast.error("Failed to load accounts");
      setAccounts([]);
    }
  };

  const roleConfig: Record<
    MessagingAccountRole,
    { label: string; color: string }
  > = {
    product_owner: {
      label: "Product Owner",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    global_admin: {
      label: "Global Administrator",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    internal_user: {
      label: "Internal User",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    external_guest: {
      label: "External Guest",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    },
  };

  const getRoleBadge = (role: MessagingAccountRole) => {
    const config =
      roleConfig[role] ??
      ({
        label: role,
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      } as const);

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const filteredAccounts = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesRole = filterRole === "all" || account.role === filterRole;

      const matchesSearch =
        !s ||
        account.email.toLowerCase().includes(s) ||
        (account.company_name ?? "").toLowerCase().includes(s);

      return matchesRole && matchesSearch;
    });
  }, [accounts, filterRole, searchTerm]);

  const handleToggleUser = (email: string): void => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleSelectAll = (): void => {
    setSelectedUsers((prev) => {
      if (prev.size === filteredAccounts.length && filteredAccounts.length > 0) {
        return new Set();
      }
      return new Set(filteredAccounts.map((a) => a.email));
    });
  };

  const handleSelectByRole = (role: MessagingAccountRole): void => {
    const roleAccounts = accounts.filter((a) => a.role === role);
    const next = new Set<string>();
    roleAccounts.forEach((a) => next.add(a.email));
    setSelectedUsers(next);
    setFilterRole(role);

    const label = role.replace(/_/g, " ");
    toast.info(`Selected all ${roleAccounts.length} ${label} accounts`);
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both title and message");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setSending(true);
    try {
      for (const email of selectedUsers) {
        await Promise.resolve(
          addNotification({
            vendor_email: email,
            auction_id: "system",
            type: "admin_message",
            title: `📬 ${title}`,
            message,
            sender, // uses adminRole without changing visible UI
          })
        );
      }

      toast.success(`Message sent to ${selectedUsers.size} recipient(s)`);
      setTitle("");
      setMessage("");
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error("Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  const selectedCount = selectedUsers.size;
  const allFilteredSelected =
    filteredAccounts.length > 0 && selectedCount === filteredAccounts.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {/* ✅ Removed Back button per request */}

          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Messaging Center
                </h1>

                {/* ✅ Removed Product Owner / Global Admin badge next to title per request */}
              </div>

              <p className="text-gray-600 dark:text-gray-400">
                Send messages to users across the platform
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Select Recipients
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Choose who should receive your message
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="border-gray-200 dark:border-gray-600"
                    type="button"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {allFilteredSelected ? "Deselect All" : "Select All Filtered"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectByRole("external_guest")}
                    className="border-gray-200 dark:border-gray-600"
                    type="button"
                  >
                    All External Guests
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectByRole("internal_user")}
                    className="border-gray-200 dark:border-gray-600"
                    type="button"
                  >
                    All Internal Users
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectByRole("global_admin")}
                    className="border-gray-200 dark:border-gray-600"
                    type="button"
                  >
                    All Global Admins
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectByRole("product_owner")}
                    className="border-gray-200 dark:border-gray-600"
                    type="button"
                  >
                    All Product Owners
                  </Button>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by email or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as RoleFilter)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="product_owner">Product Owner</option>
                    <option value="global_admin">Global Administrator</option>
                    <option value="internal_user">Internal User</option>
                    <option value="external_guest">External Guest</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedCount} recipient{selectedCount !== 1 ? "s" : ""} selected
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAccounts.map((account) => (
                        <div
                          // ✅ stable unique key (fixes React key warning)
                          key={`${account.email}-${account.role}`}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => handleToggleUser(account.email)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedUsers.has(account.email)}
                              onCheckedChange={() => handleToggleUser(account.email)}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {account.company_name || account.email}
                                </p>
                                {getRoleBadge(account.role)}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {account.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Compose Message
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  From: Emerson Procurement Team
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Message Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Important Update"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 border-gray-200 dark:border-gray-600"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="mt-1 border-gray-200 dark:border-gray-600 resize-none"
                  />
                </div>

                <Button
                  onClick={() => void handleSendMessage()}
                  disabled={sending || selectedUsers.size === 0 || !title.trim() || !message.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  type="button"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending
                    ? "Sending..."
                    : `Send to ${selectedCount} Recipient${selectedCount !== 1 ? "s" : ""}`}
                </Button>

                {selectedCount === 0 && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Select recipients to enable sending
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}