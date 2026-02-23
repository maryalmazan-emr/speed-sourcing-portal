// File: client/src/lib/connectionGuard.ts

let suppress = false;

export function suppressConnectionErrors(value: boolean = true) {
  suppress = value;
}

export function activateConnectionGuard() {
  // Lightweight global error handler (client-side only).
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (event) => {
    if (!suppress) return;
    // Common “network-ish” failures you may want to ignore during reconnect loops
    const msg = String((event as any)?.reason?.message ?? (event as any)?.reason ?? "");
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed") ||
      msg.includes("ERR_NETWORK")
    ) {
      event.preventDefault?.();
    }
  });

  window.addEventListener("error", (event) => {
    if (!suppress) return;
    const msg = String((event as any)?.message ?? "");
    if (msg.includes("ResizeObserver loop limit exceeded")) {
      event.preventDefault?.();
    }
  });
}