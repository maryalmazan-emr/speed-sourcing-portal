import crypto from "node:crypto";
import type { Admin, AdminRole, Auction } from "./types.js";

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const admins: Admin[] = [
  {
    id: id(),
    email: "mary.owner@emerson.com",
    company_name: "Mary Owner",
    role: "product_owner",
    created_at: nowIso(),
  },
  {
    id: id(),
    email: "mary.admin@emerson.com",
    company_name: "Mary Admin",
    role: "global_admin",
    created_at: nowIso(),
  },
  {
    id: id(),
    email: "test.user@emerson.com",
    company_name: "Test User",
    role: "internal_user",
    created_at: nowIso(),
  }
];

// NOTE: for now passwords are accepted but not stored/validated (matches your current frontend behavior).
export function listAdmins(): Admin[] {
  return admins;
}

export function createAdmin(email: string, companyName: string, role: AdminRole): Admin {
  const existing = admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (existing) return existing;

  const admin: Admin = {
    id: id(),
    email,
    company_name: companyName,
    role,
    created_at: nowIso(),
  };

  admins.push(admin);
  return admin;
}

export function validateAdmin(email: string): Admin | null {
  const admin = admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
  return admin ?? null;
}

// Auctions (basic)
const auctions: Auction[] = [];

export function listAuctions(): Auction[] {
  return auctions;
}

export function getAuction(auctionId: string): Auction | null {
  return auctions.find((a) => a.id === auctionId) ?? null;
}

export function createAuction(input: Partial<Auction> & { created_by_admin_email: string }): Auction {
  const auction: Auction = {
    id: id(),
    title: input.title ?? "Untitled Auction",
    description: input.description ?? "",
    status: input.status ?? "draft",
    starts_at: input.starts_at ?? null,
    ends_at: input.ends_at ?? null,
    winner_vendor_email: input.winner_vendor_email ?? null,
    created_by_admin_email: input.created_by_admin_email,
    created_at: nowIso(),
  };
  auctions.push(auction);
  return auction;
}