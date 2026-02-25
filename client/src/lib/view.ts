// File: src/lib/view.ts

export const ALL_VIEWS = [
  "admin-login",
  "admin-setup",
  "admin-dashboard",
  "vendor-login",
  "vendor-dashboard",
  "all-auctions",
  "accounts",
  "management-dashboard",
  "manage-global-admins",
  "messaging-center",
  "debug-storage",
  "faq",
] as const;

export type View = (typeof ALL_VIEWS)[number];

const normalize = (raw: string): string =>
  raw
    .trim()
    .replace(/^#/, "")
    .replace(/^\//, "")
    .toLowerCase();

export function isView(value: string): value is View {
  return (ALL_VIEWS as readonly string[]).includes(value);
}

/**
 * Hash format: #all-auctions  OR  #/all-auctions
 */
export function getViewFromHash(): View | null {
  if (typeof window === "undefined") return null;
  const raw = normalize(window.location.hash);
  if (!raw) return null;
  return isView(raw) ? raw : null;
}

export function setHashForView(view: View): void {
  if (typeof window === "undefined") return;
  const next = `#${view}`;
  if (window.location.hash !== next) window.location.hash = next;
}