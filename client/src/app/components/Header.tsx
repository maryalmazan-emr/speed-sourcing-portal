import React, { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { Menu, RotateCcw } from "lucide-react";
import emersonLogo from "figma:asset/cfb5256627e7fcdeba54c066caa0f735f3024eb6.png";
import { getRoleName } from "@/lib/adminAuth";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NotificationBell } from "@/app/components/NotificationBell";

interface HeaderProps {
  auction: any | null;
  role: "admin" | "vendor";
  onRoleChange: (role: "admin" | "vendor") => void;
  onNavigate: (view: string) => void;
  onResetAuction?: () => void;
  onCreateAuction?: () => void;
  onAdminLogout?: () => void;
  currentUser?: string;
  adminRole?: "product_owner" | "global_admin" | "internal_user" | "external_guest";
  vendorEmail?: string;
}

export function Header({
  auction,
  role,
  onRoleChange,
  onNavigate,
  onResetAuction,
  onCreateAuction,
  onAdminLogout,
  currentUser,
  adminRole,
  vendorEmail,
}: HeaderProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!auction || !auction.ends_at) {
      setTimeLeft("");
      return;
    }

    if (auction.winner_vendor_email) {
      setTimeLeft("Winner selected");
      setIsWarning(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const start = new Date(auction.starts_at).getTime();
      const end = new Date(auction.ends_at).getTime();

      if (now < start) {
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-800 shadow-sm">
      <div
        className="container mx-auto px-4 py-4 flex items-center justify-between"
        style={{ maxWidth: "1180px" }}
      >
        <div className="flex items-center gap-4">
          <img
            src={emersonLogo}
            alt="Emerson Logo"
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
                  : timeLeft === "Auction ended"
                  ? "bg-gray-100/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border"
                  : timeLeft === "Auction not started"
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {adminRole === "product_owner" || adminRole === "global_admin" ? (
                <>
                  <DropdownMenuItem onClick={() => onNavigate("management-dashboard")}>
                    📊 Management Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("messaging-center")}>
                    💬 Messaging Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("all-auctions")}>
                    📋 All Auctions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("accounts")}>
                    👥 All Accounts
                  </DropdownMenuItem>
                  {adminRole === "product_owner" && (
                    <DropdownMenuItem onClick={() => onNavigate("manage-global-admins")}>
                      🔐 Manage Global Administrators
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onAdminLogout}>
                    🚪 Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onRoleChange("admin")}>
                    🛡️ Employee View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRoleChange("vendor")}>
                    🏢 Vendor View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate("all-auctions")}>
                    📋 My Auctions
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
                  {onCreateAuction && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onCreateAuction}>
                        🆕 Create New Auction
                      </DropdownMenuItem>
                    </>
                  )}
                  {onAdminLogout && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onAdminLogout}>
                        Logout
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
``