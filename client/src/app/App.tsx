// File: src/app/App.tsx
"use client";

import "@/lib/preInit";
import { useEffect, useState } from "react";
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
import { Toaster } from "@/app/components/ui/sonner";

import {
  createAdminAccount,
  validateAdminLogin,
  createPresetAccounts,
} from "@/lib/adminAuth";

import {
  apiGetAuctions,
  apiGetAuction,
  apiMigrateInvites,
  apiValidateVendorToken,
} from "@/lib/api/";

import type { Admin } from "@/lib/backend";
import { ThemeProvider } from "@/lib/theme";

import {
  setupAutoBackup,
  checkDataIntegrity,
  createBackup,
  setupDataMonitoring,
} from "@/lib/dataProtection";

import {
  activateConnectionGuard,
  suppressConnectionErrors,
} from "@/lib/connectionGuard";

// Run once at module load
activateConnectionGuard();
suppressConnectionErrors();

type View =
  | "admin-login"
  | "admin-setup"
  | "admin-dashboard"
  | "vendor-login"
  | "vendor-dashboard"
  | "all-auctions"
  | "accounts"
  | "management-dashboard"
  | "manage-global-admins"
  | "messaging-center"
  | "debug-storage";

const VENDOR_SESSION_KEY = "speedsourcing:vendor_session";

export default function App() {
  const [role, setRole] = useState<"admin" | "vendor">("admin");
  const [view, setView] = useState<View>("admin-login");
  const [auction, setAuction] = useState<any>(null);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [adminSession, setAdminSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeApp();

    // ✅ auto-backup + monitoring (re-enabled)
    const stopAutoBackup = setupAutoBackup(15); // seconds
    const stopMonitoring = setupDataMonitoring();

    bootstrapVendorFromInviteLink();

    return () => {
      stopAutoBackup();
      stopMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrapVendorFromInviteLink = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = (params.get("token") ?? "").trim();

      const persisted = localStorage.getItem(VENDOR_SESSION_KEY);

      // Only allow vendor flow if token OR persisted vendor session exists
      if (!token && !persisted) {
        setRole("admin");
        setView("admin-login");
        return;
      }

      if (!token && persisted) {
        const session = JSON.parse(persisted);
        setVendorSession(session);
        setRole("vendor");
        await loadAuction(session.auction_id);
        setView("vendor-dashboard");
        return;
      }

      // token present: validate
      setRole("vendor");
      setView("vendor-login");

      const result = await apiValidateVendorToken(token);
      if (!result?.auction?.id || !result?.invite?.vendor_email) {
        toast.error("Invalid or expired invite link.");
        setRole("admin");
        setView("admin-login");
        return;
      }

      const session = {
        session_token: token,
        vendor_email: result.invite.vendor_email,
        vendor_company: result.invite.vendor_company,
        auction_id: result.auction.id,
      };

      localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
      setVendorSession(session);

      await loadAuction(result.auction.id);
      setView("vendor-dashboard");
      toast.success("Invite validated. Welcome!");
    } catch (err: any) {
      console.error("[bootstrapVendorFromInviteLink]", err);
      toast.error(err?.message ?? "Failed to validate invite link.");
      setRole("admin");
      setView("admin-login");
    }
  };

  const initializeApp = async () => {
    try {
      await createPresetAccounts();

      // safe even if backend doesn’t need it in some envs
      await apiMigrateInvites();

      // ✅ integrity warnings (safe guard)
      const integrity = await checkDataIntegrity();
      if (Array.isArray(integrity.issues) && integrity.issues.length > 0) {
        integrity.issues.forEach((issue) =>
          toast.warning(issue, { duration: 5000 })
        );
      }

      // startup backup
      await createBackup();

      setInitialized(true);
    } catch (error: any) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize app. Check console for details.");
      setInitialized(true);
    }
  };

  const handleRoleChange = (newRole: "admin" | "vendor") => {
    // vendor flow is invite-link only
    if (newRole === "vendor") {
      toast.info("External Guest access is available only through an invite link.");
      return;
    }

    setRole("admin");
    if (adminSession) setView(auction ? "admin-dashboard" : "admin-setup");
    else setView("admin-login");

    setVendorSession(null);
  };

  const handleAdminLogin = async (
    email: string,
    name: string,
    password: string,
    isNewAccount: boolean
  ) => {
    try {
      let admin: Admin | null = null;

      if (isNewAccount) {
        const isEmersonEmail = email.toLowerCase().endsWith("@emerson.com");
        const derivedRole = isEmersonEmail ? "internal_user" : "external_guest";
        admin = await createAdminAccount(email, password, name, derivedRole);
        toast.success("Account created successfully!");
      } else {
        admin = await validateAdminLogin(email, password);
        if (!admin) {
          toast.error("Invalid email or password");
          return;
        }
        toast.success("Logged in successfully");
      }

      if (!admin) {
        toast.error("Login failed");
        return;
      }

      const session = {
        email: admin.email,
        name: admin.company_name,
        password: "",
        role: admin.role,
        timestamp: Date.now(),
      };

      setAdminSession(session);

      if (admin.role === "product_owner" || admin.role === "global_admin") {
        setView("management-dashboard");
      } else {
        setView("admin-setup");
      }
    } catch (error: any) {
      console.error("Admin auth error:", error);
      toast.error(error?.message ?? "Failed to authenticate");
    }
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    setAuction(null);
    setView("admin-login");
    toast.info("Logged out successfully");
  };

  const handleNavigate = (target: string) => {
    if (target === "all-auctions") {
      if (!adminSession) {
        setView("admin-login");
        toast.info("Please log in to view auction history");
      } else {
        setView("all-auctions");
      }
    } else if (target === "accounts") {
      if (!adminSession) {
        setView("admin-login");
        toast.info("Please log in to view accounts");
      } else {
        setView("accounts");
      }
    } else if (target === "management-dashboard") {
      if (!adminSession) {
        setView("admin-login");
        toast.info("Please log in to access management dashboard");
      } else {
        setView("management-dashboard");
      }
    } else if (target === "manage-global-admins") {
      if (!adminSession) {
        setView("admin-login");
        toast.info("Please log in to access this page");
      } else if (adminSession.role !== "product_owner") {
        toast.error("Only Product Owners can access this page");
      } else {
        setView("manage-global-admins");
      }
    } else if (target === "messaging-center") {
      if (!adminSession) {
        setView("admin-login");
        toast.info("Please log in to access messaging");
      } else if (
        adminSession.role !== "product_owner" &&
        adminSession.role !== "global_admin"
      ) {
        toast.error("Only Product Owners and Global Administrators can access messaging");
      } else {
        setView("messaging-center");
      }
    }
  };

  const handleAuctionComplete = async () => {
    const auctions = await apiGetAuctions(adminSession?.email);
    if (auctions && auctions.length > 0) {
      const latestAuction = auctions[auctions.length - 1];
      setAuction(latestAuction);
      setView("admin-dashboard");
    }
    setAdminSession(null);
  };

  const handleVendorLogin = (session: any, auctionId: string) => {
    localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
    setVendorSession(session);
    loadAuction(auctionId);
    setView("vendor-dashboard");
  };

  const handleVendorLogout = () => {
    localStorage.removeItem(VENDOR_SESSION_KEY);
    setVendorSession(null);
    setAuction(null);

    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());

    setRole("admin");
    setView("admin-login");
  };

  const loadAuction = async (auctionId: string) => {
    try {
      const a = await apiGetAuction(auctionId);
      setAuction(a);
    } catch (error) {
      console.error("Error loading auction:", error);
      toast.error("Failed to load auction");
    }
  };

  const handleSelectAuction = (selectedAuction: any) => {
    setAuction(selectedAuction);
    if (role === "admin") setView("admin-dashboard");
  };

  const handleRefresh = () => {
    if (auction) loadAuction(auction.id);
  };

  const handleResetAuction = async () => {
    setAuction(null);
    if (adminSession?.role === "product_owner" || adminSession?.role === "global_admin") {
      setView("management-dashboard");
    } else {
      setView("admin-setup");
    }
    toast.success("Exited current auction");
  };

  const handleCreateAuction = () => {
    setAdminSession(null);
    setView("admin-login");
    toast.info("Please log in to create a new auction");
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading Speed Sourcing Portal...</div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {view !== "vendor-login" && view !== "admin-login" && (
          <Header
            auction={view === "admin-dashboard" || view === "vendor-dashboard" ? auction : null}
            role={role}
            onRoleChange={handleRoleChange}
            onNavigate={handleNavigate}
            onResetAuction={role === "admin" ? handleResetAuction : undefined}
            onCreateAuction={role === "admin" ? handleCreateAuction : undefined}
            onAdminLogout={role === "admin" && adminSession ? handleAdminLogout : undefined}
            currentUser={adminSession?.email}
            adminRole={adminSession?.role}
            vendorEmail={vendorSession?.vendor_email}
          />
        )}

        {view === "admin-login" && <AdminLogin onLogin={handleAdminLogin} />}

        {view === "admin-setup" && adminSession && (
          <AdminSetup onComplete={handleAuctionComplete} adminSession={adminSession} />
        )}

        {view === "admin-dashboard" && auction && (
          <AdminDashboard
            auction={auction}
            onRefresh={handleRefresh}
            adminRole={adminSession?.role}
          />
        )}

        {view === "vendor-login" && <VendorLogin onLogin={handleVendorLogin} />}

        {view === "vendor-dashboard" && auction && vendorSession && (
          <VendorDashboard auction={auction} session={vendorSession} onLogout={handleVendorLogout} />
        )}

        {view === "all-auctions" && adminSession && (
          <AllAuctions
            onBack={() => {
              if (adminSession.role === "product_owner" || adminSession.role === "global_admin") {
                setView("management-dashboard");
              } else {
                setView(auction ? "admin-dashboard" : "admin-setup");
              }
            }}
            onSelectAuction={handleSelectAuction}
            adminEmail={adminSession.email}
            userRole={adminSession.role}
          />
        )}

        {view === "accounts" && adminSession && (
          <Accounts
            onBack={() => {
              if (adminSession.role === "product_owner" || adminSession.role === "global_admin") {
                setView("management-dashboard");
              } else {
                setView(auction ? "admin-dashboard" : "admin-setup");
              }
            }}
            adminEmail={adminSession.email}
            userRole={adminSession.role}
          />
        )}

        {view === "management-dashboard" && adminSession && (
          <ManagementDashboard
            userRole={adminSession.role}     // ✅ REQUIRED by your ManagementDashboardProps
            onSelectAuction={handleSelectAuction}
          />
        )}

        {view === "manage-global-admins" &&
          adminSession &&
          adminSession.role === "product_owner" && (
            <ManageGlobalAdmins onBack={() => setView("management-dashboard")} />
          )}

        {view === "messaging-center" &&
          adminSession &&
          (adminSession.role === "product_owner" || adminSession.role === "global_admin") && (
            <MessagingCenter onBack={() => setView("management-dashboard")} adminRole={adminSession.role} />
          )}

        {view === "debug-storage" && <DebugStorage />}

        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}
