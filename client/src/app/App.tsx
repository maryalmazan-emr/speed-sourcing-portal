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
import { FAQ } from "@/app/components/FAQ";
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
} from "@/lib/api";

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

activateConnectionGuard();
suppressConnectionErrors();

// ---------------- Types ----------------

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
  | "debug-storage"
  | "faq";

const VENDOR_SESSION_KEY = "speedsourcing:vendor_session";

// ---------------- App ----------------

export default function App() {
  const [role, setRole] = useState<"admin" | "vendor">("admin");
  const [view, setView] = useState<View>("admin-login");
  const [auction, setAuction] = useState<any>(null);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [adminSession, setAdminSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  // ---------- Bootstrap ----------

  useEffect(() => {
    initializeApp();

    const stopAutoBackup = setupAutoBackup(15);
    const stopMonitoring = setupDataMonitoring();

    bootstrapVendorFromInviteLink();

    return () => {
      stopAutoBackup();
      stopMonitoring();
    };
  }, []);

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

      const integrity = await checkDataIntegrity();
      if (Array.isArray(integrity.issues)) {
        integrity.issues.forEach(issue =>
          toast.warning(issue, { duration: 5000 })
        );
      }

      await createBackup();
      setInitialized(true);
    } catch (err) {
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
      const role = isEmersonEmail ? "internal_user" : "external_guest";
      admin = await createAdminAccount(email, password, name, role);
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

    if (admin.role === "product_owner" || admin.role === "global_admin") {
      setView("management-dashboard");
    } else {
      setView("admin-setup");
    }
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    setAuction(null);
    setView("admin-login");
  };

  // ---------- Navigation ----------

  const handleNavigate = (target: string) => {
    if (target === "faq") {
      setView("faq");
      return;
    }

    if (target === "vendor-dashboard") {
      setView("vendor-dashboard");
      return;
    }

    if (target === "management-dashboard") {
      setView("management-dashboard");
      return;
    }

    if (target === "messaging-center") {
      setView("messaging-center");
      return;
    }

    if (target === "accounts") {
      setView("accounts");
      return;
    }

    if (target === "all-auctions") {
      setView("all-auctions");
      return;
    }
  };

  // ---------- Auction / Vendor ----------

  const handleAuctionComplete = async () => {
    const auctions = await apiGetAuctions(adminSession?.email);
    if (auctions?.length) {
      setAuction(auctions[auctions.length - 1]);
      setView("admin-dashboard");
    }
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
    setView("admin-login");
  };

  const loadAuction = async (auctionId: string) => {
    const a = await apiGetAuction(auctionId);
    setAuction(a);
  };

  const handleResetAuction = () => {
    setAuction(null);
    setView("management-dashboard");
  };

  // ---------- Render ----------

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {view !== "admin-login" && view !== "vendor-login" && (
          <Header
            auction={auction}
            role={role}
            currentView={view}
            onNavigate={handleNavigate}
            onAdminLogout={adminSession ? handleAdminLogout : undefined}
            currentUser={adminSession?.email}
            adminRole={adminSession?.role}
            vendorEmail={vendorSession?.vendor_email}
          />
        )}

        {view === "admin-login" && <AdminLogin onLogin={handleAdminLogin} />}
        {view === "admin-setup" && adminSession && (
          <AdminSetup adminSession={adminSession} onComplete={handleAuctionComplete} />
        )}
        {view === "admin-dashboard" && auction && (
          <AdminDashboard auction={auction} onRefresh={() => loadAuction(auction.id)} adminRole={adminSession?.role} />
        )}
        {view === "vendor-login" && <VendorLogin onLogin={handleVendorLogin} />}
        {view === "vendor-dashboard" && auction && vendorSession && (
          <VendorDashboard auction={auction} session={vendorSession} onLogout={handleVendorLogout} />
        )}
        {view === "all-auctions" && adminSession && (
          <AllAuctions onBack={handleResetAuction} onSelectAuction={setAuction} adminEmail={adminSession.email} userRole={adminSession.role} />
        )}
        {view === "accounts" && adminSession && (
          <Accounts onBack={() => setView("management-dashboard")} adminEmail={adminSession.email} userRole={adminSession.role} />
        )}
        {view === "management-dashboard" && adminSession && (
          <ManagementDashboard userRole={adminSession.role} onSelectAuction={setAuction} />
        )}
        {view === "manage-global-admins" && adminSession?.role === "product_owner" && (
          <ManageGlobalAdmins onBack={() => setView("management-dashboard")} />
        )}
        {view === "messaging-center" && adminSession && (
          <MessagingCenter onBack={() => setView("management-dashboard")} adminRole={adminSession.role} />
        )}
        {view === "debug-storage" && <DebugStorage />}
        {view === "faq" && <FAQ />}

        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}