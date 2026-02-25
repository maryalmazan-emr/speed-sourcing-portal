// File: client/src/app/components/AdminLogin.tsx

"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { getAllAdminAccounts } from "@/lib/adminAuth";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { DataRecoveryBanner } from "@/app/components/DataRecoveryBanner";
import { DebugStorage } from "@/app/components/DebugStorage";
import { toast } from "sonner";

interface AdminLoginProps {
  onLogin: (email: string, name: string, password: string, isNewAccount: boolean) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"checking" | "found" | "new" | null>(null);
  const [isEmailReadOnly, setIsEmailReadOnly] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const handleEmailBlur = async (): Promise<void> => {
    if (!email || !email.includes("@")) return;

    setEmailStatus("checking");

    try {
      const allAdmins = await getAllAdminAccounts();
      const existingAdmin = allAdmins.find(
        (admin) => admin.email.toLowerCase() === email.toLowerCase()
      );

      if (existingAdmin) {
        setName(existingAdmin.company_name);
        setEmailStatus("found");
        setIsEmailReadOnly(true);
      } else {
        setEmailStatus("new");
        setName("");
      }
    } catch (error) {
      console.error("Email check error:", error);
      setEmailStatus(null);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    setEmailStatus(null);
    setIsEmailReadOnly(false);

    if (emailStatus === "found") {
      setName("");
    }
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isNewAccount = emailStatus === "new";
      onLogin(email, name, password, isNewAccount);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetLogin = (presetEmail: string, presetPassword: string, presetName: string): void => {
    try {
      onLogin(presetEmail, presetName, presetPassword, false);
    } catch (error) {
      console.error("[AdminLogin] Preset login error:", error);
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebug((v) => !v)}
          type="button"
        >
          {showDebug ? "Hide" : "Show"} Debug
        </Button>
        <ThemeToggle />
      </div>

      {showDebug && <DebugStorage />}

      <DataRecoveryBanner />

      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-10 max-w-md w-full border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Internal User Login
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Welcome back! Please enter your credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">
                Emerson Email <span className="text-red-500">*</span>
              </Label>

              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => void handleEmailBlur()}
                  required
                  placeholder="yourname@emerson.com"
                  disabled={isEmailReadOnly}
                />

                {emailStatus === "checking" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-emerald-800 rounded-full" />
                  </div>
                )}

                {emailStatus === "found" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                )}

                {emailStatus === "new" && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={emailStatus === "found"}
              />
            </div>

            <div>
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Checking..." : "Log In"}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-3 text-center">Quick Login (Dev Only)</p>

              <div className="space-y-2">
                <Button
                  onClick={() => handlePresetLogin("mary.owner@emerson.com", "Emerson!", "Mary Owner")}
                  className="w-full bg-purple-600 text-xs"
                  type="button"
                >
                  Product Owner
                </Button>

                <Button
                  onClick={() => handlePresetLogin("mary.admin@emerson.com", "Emerson!", "Mary Admin")}
                  className="w-full bg-blue-600 text-xs"
                  type="button"
                >
                  Global Administrator
                </Button>

                <Button
                  onClick={() => handlePresetLogin("test.user@emerson.com", "Emerson!", "Test User")}
                  className="w-full bg-green-600 text-xs"
                  type="button"
                >
                  Internal User
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}