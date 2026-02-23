// file: src/lib/api/accounts.ts
import { apiGetInvites } from "@/lib/api/invites";
import { apiGet } from "@/lib/api/_client";

// Accounts.tsx imports apiGetAllAdmins from '@/lib/api'
export function apiGetAllAdmins() {
  return apiGet<any[]>(`/api/admins`);
}

// MessagingCenter.tsx imports getAccounts from '@/lib/api'
export async function getAccounts() {
  // Safe “best-effort” merge; if /api/admins isn’t implemented yet, this will throw.
  const [admins, invites] = await Promise.all([apiGetAllAdmins(), apiGetInvites()]);

  const adminAccounts = (admins ?? []).map((a: any) => ({
    email: a.email,
    company_name: a.company_name ?? a.name ?? a.email,
    role: a.role ?? "internal_user",
  }));

  const vendorAccounts = (invites ?? []).map((i: any) => ({
    email: i.email ?? i.vendor_email,
    company_name: i.vendor_company ?? "External Guest",
    role: "external_guest",
  }));

  return [...adminAccounts, ...vendorAccounts];
}