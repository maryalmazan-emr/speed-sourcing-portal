// File: src/app/App.tsx
"use client";

import "@/lib/preInit";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/app/components/Header";
import { AdminSetup } from "@/app/components/AdminSetup";
import { AdminDashboard } from "@/app/components/AdminDashboard";
import { AdminLogin } from "@/app/components/AdminLogin";
import { VendorLogin } from "@/app/components/VendorLogin";
import { VendorDashboard } from "@/app/components/VendorDashboard";
import { AllAuctions } from "@/app/components/AllAuctions";
import { Accounts } from "@/app/components/Accounts";
import { ManagementDashboard } from "@/app/components/ManagementDashboard";
import { ManageGlobalAdmins } from "@/app/components/ManageGlobalAdmins";
import { MessagingCenter } from "@/app/components/MessagingCenter";
import { DebugStorage } from "@/app/components/DebugStorage";
import { FAQ } from "@/app/components/FAQ";
import { Toaster } from "@/app/components/ui/sonner";
import { AccessDenied } from "@/app/components/AccessDenied";

import {
  createAdminAccount,
  validateAdminLogin,
  createPresetAccounts,
} from "@/lib/adminAuth";

// ✅ keep apiGetAuctions because App.tsx uses it to load the most recent auction after create
import { apiGetAuctions, apiGetAuction, apiMigrateInvites } from "@/lib/api";

import type { Admin } from "@/lib/backend";
import { ThemeProvider } from "@/lib/theme";

import {
  setupAutoBackup,
  // ✅ FIX: checkDataIntegrity removed because you asked to remove it
  createBackup,
  setupDataMonitoring,
} from "@/lib/dataProtection";

import {
  activateConnectionGuard,
  suppressConnectionErrors,
} from "@/lib/connectionGuard";

import type { View } from "@/lib/view";
import { getViewFromHash, setHashForView } from "@/lib/view";
import { getPermissions } from "@/lib/permissions";

activateConnectionGuard();
suppressConnectionErrors();

const VENDOR_SESSION_KEY = "speedsourcing:vendor_session";

export default function App() {
  const [role, setRole] = useState<"admin" | "vendor">("admin");
  const [view, setView] = useState<View>(() => getViewFromHash() ?? "admin-login");
  const [auction, setAuction] = useState<any>(null);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [adminSession, setAdminSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  const adminRole = adminSession?.role;
  const perms = useMemo(() => getPermissions(role, adminRole), [role, adminRole]);

  const prevViewRef = useRef<View>(view);

  // ---------- Bootstrap ----------
  useEffect(() => {
    void initializeApp();

    const stopAutoBackup = setupAutoBackup(15);
    const stopMonitoring = setupDataMonitoring();

    void bootstrapVendorFromInviteLink();

    const onHashChange = () => {
      const next = getViewFromHash();
      if (next) setView(next);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      stopAutoBackup();
      stopMonitoring();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    setHashForView(view);
  }, [view]);

  // ✅ Clear auction context when leaving admin OR vendor dashboard
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = view;

    if (
      (prev === "admin-dashboard" && view !== "admin-dashboard") ||
      (prev === "vendor-dashboard" && view !== "vendor-dashboard")
    ) {
      setAuction(null);
    }
  }, [view]);

  // ---------- Guards ----------
  useEffect(() => {
    const needsInternal =
      view.startsWith("admin") ||
      view === "all-auctions" ||
      view === "accounts" ||
      view === "management-dashboard" ||
      view === "manage-global-admins" ||
      view === "messaging-center" ||
      view === "debug-storage";

    const needsVendor = view.startsWith("vendor");

    if (needsVendor && role !== "vendor") setRole("vendor");
    if (needsInternal && role !== "admin") setRole("admin");

    if (role === "admin" && view !== "admin-login" && !adminSession) {
      setView("admin-login");
      return;
    }

    if (role === "vendor" && view !== "vendor-login" && !vendorSession) {
      setView("vendor-login");
      return;
    }

    if (!perms.canAccessView(view)) {
      setView(role === "admin" ? "all-auctions" : "vendor-dashboard");
    }
  }, [view, role, adminSession, vendorSession, perms]);

  const bootstrapVendorFromInviteLink = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get("invite") ?? params.get("token") ?? "").trim();

    localStorage.removeItem(VENDOR_SESSION_KEY);
    setVendorSession(null);

    if (token) {
      setRole("vendor");
      setView("vendor-login");
      return;
    }

    setRole("admin");
    setView("admin-login");
  };

  const initializeApp = async () => {
    try {
      await createPresetAccounts();
      await apiMigrateInvites();
      await createBackup();
      setInitialized(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to initialize app");
      setInitialized(true);
    }
  };

  // ---------- Admin Auth ----------
  const handleAdminLogin = async (
    email: string,
    name: string,
    password: string,
    isNewAccount: boolean
  ) => {
    let admin: Admin | null = null;

    if (isNewAccount) {
      const isEmersonEmail = email.toLowerCase().endsWith("@emerson.com");
      const createdRole = isEmersonEmail ? "internal_user" : "external_guest";
      admin = await createAdminAccount(email, password, name, createdRole);
    } else {
      admin = await validateAdminLogin(email, password);
    }

    if (!admin) {
      toast.error("Login failed");
      return;
    }

    setAdminSession({
      email: admin.email,
      name: admin.company_name,
      password: "",
      role: admin.role,
      timestamp: Date.now(),
    });

    setRole("admin");
    setView("all-auctions");
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    setAuction(null);
    setRole("admin");
    setView("admin-login");
  };

  // ---------- Navigation ----------
  const handleNavigate = (target: View) => {
    setView(target);
  };

  // ---------- Create Auction ----------
  const handleCreateAuction = () => {
    setAuction(null);
    setView("admin-setup");
  };

  // ✅ FIX: AdminSetup expects onComplete: () => void
  // So we keep a zero-arg handler and load the latest auction for the admin.
  const handleAuctionComplete = async (): Promise<void> => {
    try {
      const auctions = await apiGetAuctions(adminSession?.email);
      if (Array.isArray(auctions) && auctions.length > 0) {
        const latest = auctions[auctions.length - 1];
        setAuction(latest);
        setView("admin-dashboard");
        if (latest?.id) void loadAuction(latest.id);
      } else {
        toast.error("Auction created, but could not load it from the list.");
        setView("all-auctions");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load created auction");
      setView("all-auctions");
    }
  };

  // ---------- Vendor ----------
  const handleVendorLogin = (session: any, auctionId: string) => {
    localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
    setVendorSession(session);
    void loadAuction(auctionId);
    setRole("vendor");
    setView("vendor-dashboard");
  };

  const handleVendorLogout = () => {
    localStorage.removeItem(VENDOR_SESSION_KEY);
    setVendorSession(null);
    setAuction(null);
    setRole("admin");
    setView("admin-login");
  };

  const loadAuction = async (auctionId: string) => {
    const a = await apiGetAuction(auctionId);
    setAuction(a);
  };

  const handleOpenAuctionFromList = (a: any) => {
    setAuction(a);
    setView("admin-dashboard");
    if (a?.id) void loadAuction(a.id);
  };

  // ---------- Render ----------
  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const showHeader = view !== "admin-login" && view !== "vendor-login";

  const renderView = () => {
    if (view === "faq") return <FAQ />;

    if (view === "vendor-login") return <VendorLogin onLogin={handleVendorLogin} />;
    if (view === "vendor-dashboard") {
      if (!vendorSession || !auction) {
        return <AccessDenied message="Vendor session or auction not loaded." />;
      }
      return (
        <VendorDashboard
          auction={auction}
          session={vendorSession}
          onLogout={handleVendorLogout}
        />
      );
    }

    if (view === "admin-login") return <AdminLogin onLogin={handleAdminLogin} />;
    if (!adminSession) return <AccessDenied message="Please login." />;

    if (view === "admin-setup") {
      if (!perms.canCreateAuction) {
        return <AccessDenied message="Your role cannot create auctions." />;
      }
      return <AdminSetup adminSession={adminSession} onComplete={handleAuctionComplete} />;
    }

    if (view === "all-auctions") {
      return (
        <AllAuctions
          onSelectAuction={handleOpenAuctionFromList}
          adminEmail={adminSession.email}
          userRole={adminSession.role}
        />
      );
    }

    if (view === "admin-dashboard") {
      if (!auction) return <AccessDenied message="No auction selected." />;
      return (
        <AdminDashboard
          auction={auction}
          onRefresh={() => void loadAuction(auction.id)}
          adminRole={adminSession.role}
        />
      );
    }

    if (view === "management-dashboard") {
      if (!perms.canAccessManagementDashboard) {
        return <AccessDenied message="Only Product Owner and Global Admin can access this page." />;
      }
      return (
        <ManagementDashboard
          userRole={adminSession.role}
          onSelectAuction={handleOpenAuctionFromList}
        />
      );
    }

    if (view === "accounts") {
      if (!perms.canAccessAccounts) {
        return <AccessDenied message="Only Product Owner and Global Admin can access this page." />;
      }
      return (
        <Accounts
          adminEmail={adminSession.email}
          userRole={adminSession.role}
          onSelectAuction={handleOpenAuctionFromList}
        />
      );
    }

    if (view === "manage-global-admins") {
      if (!perms.canManageGlobalAdmins) {
        return <AccessDenied message="Only Product Owner can manage global admins." />;
      }
      return <ManageGlobalAdmins onBack={() => setView("management-dashboard")} />;
    }

    if (view === "messaging-center") {
      if (!perms.canUseMessagingCenter) {
        return <AccessDenied message="Only Product Owner and Global Admin can access this page." />;
      }
      return (
        <MessagingCenter
          onBack={() => setView("management-dashboard")}
          adminRole={adminSession.role}
        />
      );
    }

    if (view === "debug-storage") return <DebugStorage />;

    return <AccessDenied message="Unknown page." />;
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showHeader && (
          <Header
            auction={auction}
            role={role}
            view={view}
            onNavigate={handleNavigate}
            onCreateAuction={adminSession ? handleCreateAuction : undefined}
            onAdminLogout={adminSession ? handleAdminLogout : undefined}
            currentUser={adminSession?.email}
            adminRole={adminSession?.role}
            vendorEmail={vendorSession?.vendor_email}
          />
        )}
        {renderView()}
        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}