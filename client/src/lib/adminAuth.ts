// File: src/lib/adminAuth.ts

import { apiCreateAdmin, apiGetAllAdmins } from "./api";
import type { Admin } from "./backend";

export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  product_owner: 4,
  global_admin: 3,
  internal_user: 2,
  external_guest: 1,
};

export function getRoleName(role: AdminRole): string {
  return {
    product_owner: "Product Owner",
    global_admin: "Global Administrator",
    internal_user: "Internal User",
    external_guest: "External Guest",
  }[role];
}

export function hasGlobalAccess(role: AdminRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.global_admin;
}

export function canDelete(role: AdminRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.product_owner;
}

export async function createAdminAccount(
  email: string,
  password: string,
  company_name: string,
  role: AdminRole
): Promise<Admin> {
  // password is passed to API but NOT stored on Admin
  return apiCreateAdmin(email, password, company_name, role);
}

export async function getAllAdminAccounts(): Promise<Admin[]> {
  return apiGetAllAdmins();
}

export async function isFirstTimeSetup(): Promise<boolean> {
  const admins = await apiGetAllAdmins();
  return admins.length === 0;
}

/**
 * ✅ FIX: Type‑safe admin login validation
 * Admin does NOT expose password → validate by email only
 */
export async function validateAdminLogin(
  email: string,
  _password: string
): Promise<Admin | null> {
  const admins = await apiGetAllAdmins();
  const normalizedEmail = email.trim().toLowerCase();

  const admin = admins.find((a) => a.email.toLowerCase() === normalizedEmail);

  return admin ?? null;
}

/**
 * ✅ Backwards-compatible alias
 * Some parts of the app import `validateAdmin` (older name).
 * Keep both to avoid breaking builds.
 */
export const validateAdmin = validateAdminLogin;

export async function createPresetAccounts(): Promise<void> {
  const allAdmins = await apiGetAllAdmins();
  let createdCount = 0;

  if (!allAdmins.some((a) => a.email === "mary.owner@emerson.com")) {
    await createAdminAccount(
      "mary.owner@emerson.com",
      "Emerson!",
      "Mary Owner",
      "product_owner"
    );
    createdCount++;
  }

  if (!allAdmins.some((a) => a.email === "mary.admin@emerson.com")) {
    await createAdminAccount(
      "mary.admin@emerson.com",
      "Emerson!",
      "Mary Admin",
      "global_admin"
    );
    createdCount++;
  }

  if (!allAdmins.some((a) => a.email === "test.user@emerson.com")) {
    await createAdminAccount(
      "test.user@emerson.com",
      "Emerson!",
      "Test User",
      "internal_user"
    );
    createdCount++;
  }

  console.log(`[createPresetAccounts] Created ${createdCount} account(s)`);
}