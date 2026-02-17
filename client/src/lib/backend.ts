export interface Admin {
  id: string;
  email: string;
  company_name: string;
  role: "product_owner" | "global_admin" | "internal_user" | "external_guest";
  created_at: string;
  password_hash?: string;
}
export interface Auction {
  id: string;
  admin_id: string;
  title: string;
  description: string;
  product_details: string;
  quantity: number;
  unit: string;
  delivery_location: string;
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "completed" | "manually_closed";
  created_at: string;

  created_by_email: string;
  created_by_company: string;

  date_requested?: string;
  requestor?: string;
  requestor_email?: string;
  group_site?: string;
  event_type?: string;
  target_lead_time?: string;
  notes?: string;

  winner_vendor_email?: string;
  winner_vendor_company?: string;
  awarded_at?: string;
}

export interface VendorInvite {
  id: string;
  auction_id: string;
  vendor_email: string;
  vendor_company: string;
  invite_token: string;
  invite_sent_at: string;
  invite_method: "manual" | "email";
  status: "pending" | "accessed";
  accessed_at?: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  vendor_email: string;
  vendor_company: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  delivery_time_days: number;
  cost_per_unit: number;
  total_cost: number;
  notes: string;
  submitted_at: string;
}

export interface Supplier {
  contact_email: string;
  contact_name?: string;
  company_name: string;
  last_used: string;
}

export interface Account {
  id: string;
  email: string;
  company_name: string;
  role: "product_owner" | "global_admin" | "internal_user" | "external_guest";
  created_at: string;
}
