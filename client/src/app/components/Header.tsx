// File: src/app/components/Header.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { Menu, HelpCircle, RotateCcw, Gavel } from "lucide-react";
import logo from "@/assets/logo.png";
import { getRoleName } from "@/lib/adminAuth";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NotificationBell } from "@/app/components/NotificationBell";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/view";
import { getViewFromHash } from "@/lib/view";
import { getPermissions } from "@/lib/permissions";

interface Auction {
  starts_at?: string;
  ends_at?: string;
  winner_vendor_email?: string | null;
}

interface HeaderProps {
  auction: Auction | null;
  role: "admin" | "vendor";
  onNavigate: (view: View) => void;
  onResetAuction?: () => void;
  onCreateAuction?: () => void;
  onAdminLogout?: () => void;
  currentUser?: string;
  adminRole?:
    | "product_owner"
    | "global_admin"
    | "internal_user"
    | "external_guest";
  vendorEmail?: string;
}

export function Header({
  auction,
  role,
  onNavigate,
  onResetAuction,
  onCreateAuction,
  onAdminLogout,
  currentUser,
  adminRole,
  vendorEmail,
}: HeaderProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  // ---- Active view (no props) ----
  const [activeView, setActiveView] = useState<View | null>(() => getViewFromHash());

  useEffect(() => {
    const onHash = () => setActiveView(getViewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const perms = useMemo(() => getPermissions(role, adminRole), [role, adminRole]);

  useEffect(() => {
    if (!auction?.ends_at) {
      setTimeLeft("");
      setIsWarning(false);
      return;
    }

    if (auction.winner_vendor_email) {
      setTimeLeft("Winner selected");
      setIsWarning(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const start = auction.starts_at ? new Date(auction.starts_at).getTime() : 0;
      const end = new Date(auction.ends_at!).getTime();

      if (start && now < start) {
        setTimeLeft("Auction not started");
        setIsWarning(false);
        return;
      }

      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Auction ended");
        setIsWarning(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const totalHours = days * 24 + hours;
      setIsWarning(totalHours < 1);

      if (days > 0) {
        setTimeLeft(
          `${days}d ${hours.toString().padStart(2, "0")}h ${minutes
            .toString()
            .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
        );
      } else {
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}h ${minutes
            .toString()
            .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const itemClass = (view: View) =>
    cn(
      "cursor-pointer",
      activeView === view && "bg-gray-100 dark:bg-gray-700 font-medium"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-800 shadow-sm">
      <div
        className="container mx-auto px-4 py-4 flex items-center justify-between"
        style={{ maxWidth: "1180px" }}
      >
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="Emerson Logo"
            height={40}
            width={160}
            loading="eager"
            className="h-10 w-auto object-contain"
          />
          <span className="font-semibold text-lg text-[#262728] dark:text-white hidden md:inline">
            Speed Sourcing Portal
          </span>
        </div>

        <div className="flex-1 flex justify-center">
          {timeLeft && (
            <div
              className={`px-6 py-2 rounded-md font-mono text-base font-semibold ${
                timeLeft === "Winner selected"
                  ? "bg-[#00573d] text-white"
                  : timeLeft === "Auction ended" || timeLeft === "Auction not started"
                  ? "bg-gray-100/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border"
                  : isWarning
                  ? "bg-[#d4183d] text-white animate-pulse"
                  : "bg-[#004b8d] text-white"
              }`}
            >
              {timeLeft === "Winner selected"
                ? "Winner Selected"
                : timeLeft === "Auction ended"
                ? "Auction Ended"
                : timeLeft === "Auction not started"
                ? "Auction Not Started"
                : `Time left: ${timeLeft}`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <NotificationBell
            vendorEmail={vendorEmail}
            adminEmail={currentUser}
            role={role}
            adminRole={adminRole}
          />

          {/* MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* Vendor menu */}
              {role === "vendor" && (
                <>
                  <DropdownMenuItem
                    className={itemClass("vendor-dashboard")}
                    onClick={() => onNavigate("vendor-dashboard")}
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Auction
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className={itemClass("faq")}
                    onClick={() => onNavigate("faq")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>
                </>
              )}

              {/* Admin menu */}
              {role === "admin" && (
                <>
                  <DropdownMenuItem
                    className={itemClass("all-auctions")}
                    onClick={() => onNavigate("all-auctions")}
                  >
                    📋 {perms.auctionsLabel}
                  </DropdownMenuItem>

                  {perms.canCreateAuction && (
                    <DropdownMenuItem onClick={() => onCreateAuction?.()}>
                      🆕 Create New Auction
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {perms.canAccessManagementDashboard && (
                    <DropdownMenuItem
                      className={itemClass("management-dashboard")}
                      onClick={() => onNavigate("management-dashboard")}
                    >
                      📊 Management Dashboard
                    </DropdownMenuItem>
                  )}

                  {perms.canUseMessagingCenter && (
                    <DropdownMenuItem
                      className={itemClass("messaging-center")}
                      onClick={() => onNavigate("messaging-center")}
                    >
                      💬 Messaging Center
                    </DropdownMenuItem>
                  )}

                  {perms.canAccessAccounts && (
                    <DropdownMenuItem
                      className={itemClass("accounts")}
                      onClick={() => onNavigate("accounts")}
                    >
                      👥 All Accounts
                    </DropdownMenuItem>
                  )}

                  {perms.canManageGlobalAdmins && (
                    <DropdownMenuItem
                      className={itemClass("manage-global-admins")}
                      onClick={() => onNavigate("manage-global-admins")}
                    >
                      🔐 Manage Global Administrators
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className={itemClass("faq")}
                    onClick={() => onNavigate("faq")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>

                  {onResetAuction && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onResetAuction}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Exit Current Auction
                      </DropdownMenuItem>
                    </>
                  )}

                  {onAdminLogout && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onAdminLogout}>
                        🚪 Logout
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-xs font-medium text-white px-3 py-1 bg-[#00573d] rounded-md">
            {role === "admin"
              ? adminRole
                ? getRoleName(adminRole)
                : "Internal User"
              : "External Guest"}
          </div>

          {currentUser && (
            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              {currentUser}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}