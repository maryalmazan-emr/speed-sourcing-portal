// File: src/lib/api/admins.ts
import { apiGet } from "@/lib/api/_client";

export function apiGetAllAdmins() {
  return apiGet<any[]>(`/api/admins`);
}
