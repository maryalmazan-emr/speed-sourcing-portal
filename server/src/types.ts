// File: server/src/types.ts

export type AdminRole =
  | "product_owner"
  | "global_admin"
  | "internal_user"
  | "external_guest";

export type Admin = {
  id: string;
  email: string;
  company_name: string;
  role: AdminRole;
  created_at: string;
};

export type AuctionStatus = "draft" | "live" | "completed" | "canceled";

export type Auction = {
  id: string;
  title: string;
  description: string;
  status: AuctionStatus;
  starts_at: string | null;
  ends_at: string | null;
  winner_vendor_email: string | null;
  created_by_admin_email: string;
  created_at: string;
};