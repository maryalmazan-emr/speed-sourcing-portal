// client/src/app/App.tsx

import React, { useEffect, useState } from "react";

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
import { toast } from "sonner";

import { createAdminAccount, validateAdminLogin, createPresetAccounts } from "@/lib/adminAuth";
import { apiGetAuctions, apiGetAuction, apiMigrateInvites } from "@/lib/api";
import type { Admin } from "@/lib/backend";

import { ThemeProvider } from "@/lib/theme";
import { setupAutoBackup, checkDataIntegrity, createBackup, setupDataMonitoring } from "@/lib/dataProtection";

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

export default function App() {
  // Check URL parameters for initial view
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get("view");

  const initialRole: "admin" | "vendor" = viewParam === "vendor" ? "vendor" : "admin";
  const initialView: View = viewParam === "vendor" ? "vendor-login" : "admin-login";

  const [role, setRole] = useState<"admin" | "vendor">(initialRole);
  const [view, setView] = useState<View>(initialView);

  const [auction, setAuction] = useState<any>(null);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [adminSession, setAdminSession] = useState<any>(null);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeApp();

    // Set up automatic backups every 15 minutes
    const stopAutoBackup = setupAutoBackup(15);

    // Set up data loss monitoring
    const stopMonitoring = setupDataMonitoring();

    // Global error handlers for debugging (matches your Figma logic)
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || "";
      const errorStr = event.error ? String(event.error) : "";

      const nonCriticalErrors = [
        "callback is not a function",
        "send was called before connect",
        "websocket",
        "ws://",
        "wss://",
        "Failed to execute 'send' on 'WebSocket'",
        "Connection is not open",
        "ResizeObserver loop limit exceeded"
      ];

      const isNonCritical = nonCriticalErrors.some(
        (pattern) =>
          errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
          errorStr.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isNonCritical) {
        console.warn("[App] Suppressing non-critical error:", errorMessage || errorStr);
        event.preventDefault();
        return;
      }

      console.error("[Global Error Handler]", {
        message: errorMessage,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = event.reason ? String(event.reason) : "";

      const nonCriticalPatterns = [
        "callback is not a function",
        "send was called before connect",
        "websocket",
        "ws://",
        "wss://",
        "Failed to execute 'send' on 'WebSocket'",
        "Connection is not open"
      ];

      const isNonCritical = nonCriticalPatterns.some((pattern) =>
        reasonStr.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isNonCritical) {
        console.warn("[App] Suppressing non-critical promise rejection:", reasonStr);
        event.preventDefault();
        return;
      }

      console.error("[Unhandled Promise Rejection]", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      stopAutoBackup();
      stopMonitoring();
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🚀 Speed Sourcing Portal - Local Mode");
      console.log("═══════════════════════════════════════════════════════════");

      console.log("[App] Ensuring preset accounts exist...");
      await createPresetAccounts();
      console.log("[App] Preset accounts ready");

      console.log("[App] Running invite migration...");
      await apiMigrateInvites();
      console.log("[App] Invite migration complete");

      console.log("[App] Checking data integrity...");
      const integrity = await checkDataIntegrity();
      console.log("[App] Data integrity check:", integrity);

      if (integrity.issues.length > 0) {
        console.warn("[App] ⚠️ Data integrity issues detected:", integrity.issues);
        const realIssues = integrity.issues.filter((issue: string) => !issue.includes("No admin accounts found"));
        realIssues.forEach((issue: string) => toast.warning(issue, { duration: 5000 }));
      }

      console.log("[App] Creating initial backup...");
      await createBackup();

      setInitialized(true);
      console.log("[App] ✅ Initialization complete!");
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize app. Check console for details.");
      setInitialized(true);
    }
  };

  const handleRoleChange = (newRole: "admin" | "vendor") => {
    setRole(newRole);

    if (newRole === "admin") {
      if (adminSession) {
        setView(auction ? "admin-dashboard" : "admin-setup");
      } else {
        setView("admin-login");
      }
      setVendorSession(null);
    } else {
      setView("vendor-login");
      setAdminSession(null);
    }
  };

  const handleAdminLogin = async (email: string, name: string, password: string, isNewAccount: boolean) => {
    try {
      let admin: Admin | null = null;

      if (isNewAccount) {
        const isEmersonEmail = email.toLowerCase().endsWith("@emerson.com");
        const role = isEmersonEmail ? "internal_user" : "external_guest";
        admin = await createAdminAccount(email, password, name, role);
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
        password: "", // don't store password
        role: admin.role,
        timestamp: Date.now()
      };

      setAdminSession(session);

      if (admin.role === "external_guest") {
        toast.success(isNewAccount ? "Welcome, Emerson Guest" : "Welcome back, Emerson Guest");
      } else {
        toast.success(isNewAccount ? `Welcome, ${admin.company_name}` : `Welcome back, ${admin.company_name}`);
      }

      if (admin.role === "product_owner" || admin.role === "global_admin") {
        setView("management-dashboard");
      } else {
        setView("admin-setup");
      }
    } catch (error: any) {
      console.error("Admin auth error:", error);
      toast.error(error.message || "Failed to authenticate");
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
      } else if (adminSession.role !== "product_owner" && adminSession.role !== "global_admin") {
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
    setVendorSession(session);
    loadAuction(auctionId);
    setView("vendor-dashboard");
  };

  const handleVendorLogout = () => {
    setVendorSession(null);
    setView("vendor-login");
    setAuction(null);
  };

  const loadAuction = async (auctionId: string) => {
    try {
      const loadedAuction = await apiGetAuction(auctionId);
      setAuction(loadedAuction);
    } catch (error) {
      console.error("Error loading auction:", error);
      toast.error("Failed to load auction");
    }
  };

  const handleSelectAuction = (selectedAuction: any) => {
    setAuction(selectedAuction);
    if (role === "admin") {
      setView("admin-dashboard");
    }
  };

  const handleRefresh = () => {
    if (auction) {
      loadAuction(auction.id);
    }
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
          <AdminDashboard auction={auction} onRefresh={handleRefresh} adminRole={adminSession?.role} />
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
            adminPassword={adminSession.password}
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
            adminEmail={adminSession.email}
            adminPassword={adminSession.password}
            userRole={adminSession.role}
            onSelectAuction={handleSelectAuction}
          />
        )}

        {view === "manage-global-admins" && adminSession && adminSession.role === "product_owner" && (
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
``