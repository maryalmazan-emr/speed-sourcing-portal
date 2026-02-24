// File: src/app/components/VendorLogin.tsx

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { toast } from "sonner";
import { apiValidateVendorToken } from "@/lib/api";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { DebugStorage } from "@/app/components/DebugStorage";

interface VendorLoginProps {
  onLogin: (session: any, auctionId: string) => void;
}

export function VendorLogin({ onLogin }: VendorLoginProps) {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // ✅ Prefill from invite link (invite-only access)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get("invite") ?? params.get("token") ?? "").trim();
    const emailParam = (params.get("email") ?? "").trim().toLowerCase();

    if (token && !inviteCode) setInviteCode(token);
    if (emailParam && !email) setEmail(emailParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedInviteCode = inviteCode.trim();

      const result = await apiValidateVendorToken(trimmedInviteCode);

      // tolerate multiple backend shapes
      const auctionId = result?.auction?.id ?? result?.auction_id;
      const vendorEmail =
        (result?.invite?.vendor_email ?? result?.vendor_email ?? "").toLowerCase();
      const vendorCompany = result?.invite?.vendor_company ?? result?.vendor_company;

      if (!result || !auctionId || !vendorEmail) {
        toast.error("Invalid invite code. Please check your invite code and try again.");
        return;
      }

      if (!trimmedEmail) {
        toast.error("Email is required");
        return;
      }

      if (vendorEmail !== trimmedEmail) {
        toast.error("Email does not match invite code");
        return;
      }

      toast.success("Login successful!");

      const session = {
        session_token: trimmedInviteCode,
        vendor_email: trimmedEmail,
        vendor_company: vendorCompany,
        auction_id: auctionId,
      };

      onLogin(session, auctionId);
    } catch (error: any) {
      console.error("[VendorLogin] Login error:", error);
      toast.error(error?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors">
      <div className="absolute top-4 right-4 flex gap-2">
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

      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">External Guest Login</CardTitle>
          <CardDescription>
            Enter your email and invite code to access the auction
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABC123"
                required
                className="font-mono"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
