// File: src/lib/permissions.ts

import type { View } from "@/lib/view";

export type AppRole = "admin" | "vendor";

/**
 * IMPORTANT SEMANTICS:
 * - Only "product_owner" and "global_admin" are TRUE ADMINS.
 * - "internal_user" is an internal user (buyer) but NOT an admin.
 * - "external_guest" is not an internal user (vendor-side access is handled by AppRole="vendor").
 */
export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

export type Permissions = {
  // High-level capabilities
  canCreateAuction: boolean; // internal buyers can create; vendors cannot
  canAccessManagementDashboard: boolean; // admins only (PO + GA)
  canUseMessagingCenter: boolean; // admins only (PO + GA)
  canAccessAccounts: boolean; // admins only (PO + GA)
  canManageGlobalAdmins: boolean; // product_owner only

  // Navigation/view access
  canAccessView: (view: View) => boolean;

  // Labels / UX helpers
  auctionsLabel: "All Auctions" | "My Auctions";
};

export function getPermissions(role: AppRole, adminRole?: AdminRole): Permissions {
  const isTrueAdmin =
    role === "admin" && (adminRole === "product_owner" || adminRole === "global_admin");

  const isInternalUser = role === "admin" && adminRole === "internal_user";

  // ✅ Internal users can create auctions; vendors cannot.
  // ✅ PO + GA can also create (if your flow allows it).
  const canCreateAuction = role === "admin" && (isTrueAdmin || isInternalUser);

  // ✅ Admin-only pages (PO + GA)
  const canAccessManagementDashboard = isTrueAdmin;
  const canUseMessagingCenter = isTrueAdmin;
  const canAccessAccounts = isTrueAdmin;

  // ✅ Only Product Owner can manage global admins (even if hidden from menu)
  const canManageGlobalAdmins = role === "admin" && adminRole === "product_owner";

  const auctionsLabel: "All Auctions" | "My Auctions" = isTrueAdmin ? "All Auctions" : "My Auctions";

  const canAccessView = (view: View): boolean => {
    // Vendor-only views
    if (view === "vendor-login" || view === "vendor-dashboard") {
      return role === "vendor";
    }

    // Admin-side authentication views (internal portal)
    if (view === "admin-login" || view === "admin-setup") {
      return role === "admin";
    }

    // Admin dashboard in your app is effectively the INTERNAL user workspace.
    // Internal users can access it, but they are not "admins" in terms of privileges.
    if (view === "admin-dashboard") {
      return role === "admin";
    }

    // Everyone
    if (view === "faq") return true;

    // Debug: admins/internal portal only
    if (view === "debug-storage") return role === "admin";

    // Auctions list page exists for all internal portal users,
    // but content is filtered inside the component (My vs All).
    if (view === "all-auctions") return role === "admin";

    // True-admin-only pages
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
