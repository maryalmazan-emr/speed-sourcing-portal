// File: src/lib/permissions.ts

import type { View } from "@/lib/view";

export type AppRole = "admin" | "vendor";

export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

export type Permissions = {
  // High-level capabilities
  canCreateAuction: boolean;
  canAccessManagementDashboard: boolean;
  canUseMessagingCenter: boolean;
  canAccessAccounts: boolean;
  canManageGlobalAdmins: boolean;

  // Navigation/view access
  canAccessView: (view: View) => boolean;

  // Labels / UX helpers
  auctionsLabel: "All Auctions" | "My Auctions";
};

export function getPermissions(role: AppRole, adminRole?: AdminRole): Permissions {
  const isPrivilegedAdmin =
    adminRole === "product_owner" || adminRole === "global_admin";

  // ✅ Your requirement: internal_user CAN create auctions, vendors cannot.
  const canCreateAuction =
    role === "admin" &&
    (adminRole === "product_owner" ||
      adminRole === "global_admin" ||
      adminRole === "internal_user");

  const canAccessManagementDashboard = role === "admin" && isPrivilegedAdmin;
  const canUseMessagingCenter = role === "admin" && isPrivilegedAdmin;
  const canAccessAccounts = role === "admin" && isPrivilegedAdmin;
  const canManageGlobalAdmins = role === "admin" && adminRole === "product_owner";

  const auctionsLabel: "All Auctions" | "My Auctions" = isPrivilegedAdmin
    ? "All Auctions"
    : "My Auctions";

  const canAccessView = (view: View): boolean => {
    // Vendor-only views
    if (view === "vendor-login" || view === "vendor-dashboard") {
      return role === "vendor";
    }

    // Admin-only views
    if (view === "admin-login" || view === "admin-setup" || view === "admin-dashboard") {
      return role === "admin";
    }

    // Everyone views
    if (view === "faq") return true;

    // Debug page: allow admins only (you can change this if you want)
    if (view === "debug-storage") return role === "admin";

    // Common admin list page (content filtered inside component for internal_user)
    if (view === "all-auctions") return role === "admin";

    // Privileged-only pages
    if (view === "management-dashboard") return canAccessManagementDashboard;
    if (view === "messaging-center") return canUseMessagingCenter;
    if (view === "accounts") return canAccessAccounts;
    if (view === "manage-global-admins") return canManageGlobalAdmins;

    return false;
  };

  return {
    canCreateAuction,
    canAccessManagementDashboard,
    canUseMessagingCenter,
    canAccessAccounts,
    canManageGlobalAdmins,
    canAccessView,
    auctionsLabel,
  };
}