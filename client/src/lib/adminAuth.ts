/**
 * Admin Authentication & Role Management
 * Uses the .NET-backed API layer (local now, Azure later).
 */

import { apiCreateAdmin, apiValidateAdmin, apiGetAllAdmins } from "./api";
import type { Admin } from "./backend";

export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

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
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export function canDelete(role: AdminRole): boolean {
  return getRoleLevel(role) >= getRoleLevel("product_owner");
}

export function canManageAccounts(role: AdminRole): boolean {
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export function canSendMessages(role: AdminRole): boolean {
  return getRoleLevel(role) >= getRoleLevel("global_admin");
}

export async function createAdminAccount(
  email: string,
  password: string,
  company_name: string,
  role: AdminRole
): Promise<Admin> {
  return apiCreateAdmin(email, password, company_name, role);
}

export async function validateAdminLogin(
  email: string,
  password: string
): Promise<Admin | null> {
  return apiValidateAdmin(email, password);
}

export async function getAllAdminAccounts(): Promise<Admin[]> {
  return apiGetAllAdmins();
}

export async function isFirstTimeSetup(): Promise<boolean> {
  const admins = await apiGetAllAdmins();
  return admins.length === 0;
}

export async function createPresetAccounts(): Promise<void> {
  const allAdmins = await apiGetAllAdmins();
  let createdCount = 0;

  if (!allAdmins.some(a => a.email === "mary.owner@emerson.com")) {
    await createAdminAccount(
      "mary.owner@emerson.com",
      "Emerson!",
      "Mary Owner",
      "product_owner"
    );
    createdCount++;
  }

  if (!allAdmins.some(a => a.email === "mary.admin@emerson.com")) {
    await createAdminAccount(
      "mary.admin@emerson.com",
      "Emerson!",
      "Mary Admin",
      "global_admin"
    );
    createdCount++;
  }

  if (!allAdmins.some(a => a.email === "test.user@emerson.com")) {
    await createAdminAccount(
      "test.user@emerson.com",
      "Emerson!",
      "Test",
      "internal_user"
    );
    createdCount++;
  }

  console.log(`[createPresetAccounts] Created ${createdCount} account(s)`);
}
