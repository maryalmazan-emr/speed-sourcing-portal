/**
 * Admin Authentication & Role Management
 * Uses the .NET-backed API layer (local now, Azure later).
 */

import { apiCreateAdmin, apiValidateAdmin, apiGetAllAdmins } from "./api";
import type { Admin } from "./backend";

export type AdminRole = "product_owner" | "global_admin" | "internal_user" | "external_guest";

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  product_owner: 4,
  global_admin: 3,
  internal_user: 2,
  external_guest: 1,
};

export function getRoleName(role: AdminRole): string {
  const names: Record<AdminRole, string> = {
    product_owner: "Product Owner",
    global_admin: "Global Administrator",
    internal_user: "Internal User",
    external_guest: "External Guest",
  };
  return names[role];
}

export function getRoleLevel(role: AdminRole): number {
  return ROLE_HIERARCHY[role];
}

export function hasGlobalAccess(role: AdminRole): boolean {
  // Product Owner and Global Admin can see all auctions and accounts
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export function canDelete(role: AdminRole): boolean {
  // Note: We don't actually delete - we maintain audit trail
  // This is for UI purposes only
  return getRoleLevel(role) >= getRoleLevel("product_owner");
}

export function canManageAccounts(role: AdminRole): boolean {
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export function canSendMessages(role: AdminRole): boolean {
  // Product Owner and Global Admin can send messages to vendors
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export async function createAdminAccount(
  email: string,
  password: string,
  company_name: string,
  role: AdminRole
): Promise<Admin> {
  return await apiCreateAdmin(email, password, company_name, role);
}

export async function validateAdminLogin(email: string, password: string): Promise<Admin | null> {
  return await apiValidateAdmin(email, password);
}

export async function getAllAdminAccounts(): Promise<Admin[]> {
  return await apiGetAllAdmins();
}

// Check if this is the first time setup (no admins exist)
export async function isFirstTimeSetup(): Promise<boolean> {
  const admins = await apiGetAllAdmins();
  return admins.length === 0;
}

// Create the default preset accounts (idempotent - only creates if they don't exist)
export async function createPresetAccounts(): Promise<void> {
  const allAdmins = await apiGetAllAdmins();
  console.log(
    "[createPresetAccounts] Starting preset account creation. Current admin count:",
    allAdmins.length
  );

  let createdCount = 0;

  // Check if Product Owner exists
  const productOwnerExists = allAdmins.some((admin) => admin.email === "mary.owner@emerson.com");
  if (!productOwnerExists) {
    await createAdminAccount("mary.owner@emerson.com", "Emerson!", "Mary Owner", "product_owner");
    createdCount++;
    console.log("[createPresetAccounts] ✅ Created Product Owner: mary.owner@emerson.com");
  }

  // Check if Global Administrator exists
  const globalAdminExists = allAdmins.some((admin) => admin.email === "mary.admin@emerson.com");
  if (!globalAdminExists) {
    await createAdminAccount("mary.admin@emerson.com", "Emerson!", "Mary Admin", "global_admin");
    createdCount++;
    console.log("[createPresetAccounts] ✅ Created Global Admin: mary.admin@emerson.com");
  }

  // Check if test Internal User exists
  const internalUserExists = allAdmins.some((admin) => admin.email === "test.user@emerson.com");
  if (!internalUserExists) {
    await createAdminAccount("test.user@emerson.com", "Emerson!", "Test", "internal_user");
    createdCount++;
    console.log("[createPresetAccounts] ✅ Created Internal User: test.user@emerson.com");
  }

  if (createdCount > 0) {
    console.log(`[createPresetAccounts] ✅ Created ${createdCount} preset account(s)`);
  } else {
    console.log("[createPresetAccounts] All preset accounts already exist");
  }

  // Verify final count
  const finalAdmins = await apiGetAllAdmins();
  console.log("[createPresetAccounts] Final admin count:", finalAdmins.length);
}
