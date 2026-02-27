// File: client/src/app/components/Header.tsx
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
import { Menu, HelpCircle, Gavel, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { getRoleName } from "@/lib/adminAuth";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NotificationBell } from "@/app/components/NotificationBell";
import type { View } from "@/lib/view";
import { getPermissions } from "@/lib/permissions";

interface Auction {
  id?: string;
  title?: string | null;
  starts_at?: string;
  ends_at?: string;
  winner_vendor_email?: string | null;
}

interface HeaderProps {
  auction: Auction | null;
  role: "admin" | "vendor";
  view: View;
  onNavigate: (view: View) => void;
  onCreateAuction?: () => void;
  onAdminLogout?: () => void;
  currentUser?: string;
  adminRole?: "product_owner" | "global_admin" | "internal_user" | "external_guest";
  vendorEmail?: string;
}

export function Header({
  auction,
  role,
  view,
  onNavigate,
  onCreateAuction,
  onAdminLogout,
  currentUser,
  adminRole,
  vendorEmail,
}: HeaderProps) {
  const perms = useMemo(() => getPermissions(role, adminRole), [role, adminRole]);

  // ✅ Only PO + GA are true admins
  const isTrueAdmin =
    role === "admin" &&
    (adminRole === "product_owner" || adminRole === "global_admin");

  // ✅ Show auction context ONLY on auction views
  const shouldShowAuctionContext =
    !!auction && (view === "admin-dashboard" || view === "vendor-dashboard");

  // Presence-based animation (smooth in/out)
  const [renderContext, setRenderContext] = useState(false);
  const [contextVisible, setContextVisible] = useState(false);

  // Timer state (only runs when context is shown)
  const [timeLeft, setTimeLeft] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (shouldShowAuctionContext) {
      setRenderContext(true);
      // next tick -> animate in
      requestAnimationFrame(() => setContextVisible(true));
      return;
    }

    // animate out then unmount
    setContextVisible(false);
    const t = window.setTimeout(() => setRenderContext(false), 220);
    return () => window.clearTimeout(t);
  }, [shouldShowAuctionContext]);

  // ---------------- Auction Timer (only when context shown) ----------------
  useEffect(() => {
    if (!renderContext || !auction?.ends_at) {
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
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [renderContext, auction?.starts_at, auction?.ends_at, auction?.winner_vendor_email]);

  const roleLabel =
    role === "vendor"
      ? "External Guest"
      : isTrueAdmin
      ? getRoleName(adminRole!)
      : "Internal User";

  const auctionTitle =
    (auction?.title && String(auction.title).trim()) ||
    (auction?.id ? `Auction ${String(auction.id).substring(0, 8).toUpperCase()}` : "Auction");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
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

        {/* ✅ Breadcrumb + Timer (only when viewing an auction) */}
        <div className="flex-1 flex justify-center">
          {renderContext ? (
            <div
              className={[
                "flex items-center gap-3",
                "transition-all duration-200 ease-out",
                contextVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
              ].join(" ")}
            >
              {/* Breadcrumb */}
              <div
                className="
                  px-4 py-2 rounded-md border
                  bg-gray-50 text-gray-900 border-gray-200
                  dark:bg-gray-900/40 dark:text-gray-100 dark:border-gray-700
                  text-sm font-medium
                "
                title={auctionTitle}
              >
                Viewing auction:{" "}
                <span className="font-semibold">{auctionTitle}</span>
              </div>

              {/* Timer chip */}
              {timeLeft ? (
                <div
                  className={`px-4 py-2 rounded-md font-mono text-sm font-semibold ${
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
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <NotificationBell
            vendorEmail={vendorEmail}
            adminEmail={currentUser}
            role={role}
            adminRole={adminRole}
          />

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
                  <DropdownMenuItem onClick={() => onNavigate("vendor-dashboard")}>
                    <Gavel className="h-4 w-4 mr-2" />
                    Auction
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onNavigate("faq")}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>
                </>
              )}

              {/* True Admin menu (PO + GA): ONLY 4 items + Logout */}
              {role === "admin" && isTrueAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onNavigate("all-auctions")}>
                    📋 All Auctions
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onNavigate("management-dashboard")}>
                    📊 Management Dashboard
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onNavigate("messaging-center")}>
                    💬 Messaging Center
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onNavigate("accounts")}>
                    👥 All Accounts
                  </DropdownMenuItem>

                  {onAdminLogout ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onAdminLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              )}

              {/* Internal user menu (NOT admin): limited items + Logout */}
              {role === "admin" && !isTrueAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onNavigate("all-auctions")}>
                    📋 {perms.auctionsLabel}
                  </DropdownMenuItem>

                  {perms.canCreateAuction ? (
                    <DropdownMenuItem onClick={() => onCreateAuction?.()}>
                      🆕 Create New Auction
                    </DropdownMenuItem>
                  ) : null}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => onNavigate("faq")}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>

                  {onAdminLogout ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onAdminLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Role chip */}
          <div className="text-xs font-medium text-white px-3 py-1 bg-[#00573d] rounded-md">
            {roleLabel}
          </div>

          {/* Current user chip */}
          {currentUser ? (
            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              {currentUser}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}