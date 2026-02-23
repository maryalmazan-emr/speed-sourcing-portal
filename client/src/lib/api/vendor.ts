// file: src/lib/api/vendor.ts
import { apiPost } from "@/lib/api/_client";

// ✅ matches VendorController.Validate
export function apiValidateVendorToken(token: string) {
  return apiPost<any>(`/api/vendor/validate`, { token });
}

// ✅ matches VendorController.Access
export function apiUpdateVendorAccess(token: string) {
  return apiPost<void>(`/api/vendor/access`, { token });
}