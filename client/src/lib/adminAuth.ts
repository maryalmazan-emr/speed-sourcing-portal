// File: src/lib/adminAuth.ts

import { kv } from "@/lib/kv";
import type { Admin } from "@/lib/backend";

export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

const ADMINS_KEY = "admins";

function nowIso() {
  return new Date().toISOString();
}

function simpleHash(input: string): string {
  try {
    return btoa(unescape(encodeURIComponent(input))).slice(0, 64);
  } catch {
    return input;
  }
}

async function getAdmins(): Promise<any[]> {
  const v: unknown = await (kv as any).get(ADMINS_KEY);
  return Array.isArray(v) ? v : [];
}

async function setAdmins(admins: any[]): Promise<void> {
  await (kv as any).set(ADMINS_KEY, admins);
}

function normalizeEmail(email: string) {
  return (email ?? "").trim().toLowerCase();
}

export function getRoleName(role: AdminRole): string {
  switch (role) {
    case "product_owner":
      return "Product Owner";
    case "global_admin":
      return "Global Administrator";
    case "internal_user":
      return "Internal User";
    case "external_guest":
      return "External Guest";
    default:
      return String(role);
  }
}

export function hasGlobalAccess(role: AdminRole): boolean {
  return role === "product_owner" || role === "global_admin";
}

export function canDelete(role: AdminRole): boolean {
  return role === "product_owner";
}

export async function getAllAdminAccounts(): Promise<Admin[]> {
  const admins = await getAdmins();
  return admins as Admin[];
}

export async function createAdminAccount(
  email: string,
  password: string,
  name: string,
  role: AdminRole
): Promise<Admin> {
  const normalized = normalizeEmail(email);
  const admins = await getAdmins();

  const existing = admins.find((a) => normalizeEmail(a.email) === normalized);
  if (existing) {
    return existing as Admin;
  }

  const admin: any = {
    id: crypto?.randomUUID?.() ?? String(Date.now()),
    email: normalized,
    company_name: name,
    role,
    created_at: nowIso(),
    password_hash: simpleHash(`${normalized}:${password}`),
  };

  admins.push(admin);
  await setAdmins(admins);

  return admin as Admin;
}

export async function validateAdminLogin(
  email: string,
  password: string
): Promise<Admin | null> {
  const normalized = normalizeEmail(email);
  const admins = await getAdmins();

  const found = admins.find((a) => normalizeEmail(a.email) === normalized);
  if (!found) return null;

  const expected = found.password_hash;
  const actual = simpleHash(`${normalized}:${password}`);
  if (expected !== actual) return null;

  return found as Admin;
}

/**
 * Ensures preset accounts exist (idempotent).
 * Matches the dev quick-login emails used elsewhere in your project history. [1](https://emerson-my.sharepoint.com/personal/mary_almazan_emerson_com/Documents/Downloads/src.zip)
 */
export async function createPresetAccounts(): Promise<void> {
  const admins = await getAdmins();

  const ensure = async (email: string, password: string, name: string, role: AdminRole) => {
    const normalized = normalizeEmail(email);
    const existing = admins.find((a) => normalizeEmail(a.email) === normalized);
    if (existing) return;

    admins.push({
      id: crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
      email: normalized,
      company_name: name,
      role,
      created_at: nowIso(),
      password_hash: simpleHash(`${normalized}:${password}`),
    });
  };

  await ensure("mary.owner@emerson.com", "Emerson!", "Owner", "product_owner");
  await ensure("mary.admin@emerson.com", "Emerson!", "Global Admin", "global_admin");
  await ensure("test.user@emerson.com", "Emerson!", "Test: Internal User", "internal_user");

  await setAdmins(admins);
}