// File: src/lib/api/vendor.ts
import { apiPost } from "@/lib/api/_client";

export function apiValidateVendorToken(token: string) {
  return apiPost<any>(`/api/vendor/validate`, { token });
}

export function apiUpdateVendorAccess(token: string) {
  return apiPost<void>(`/api/vendor/access`, { token });
}
