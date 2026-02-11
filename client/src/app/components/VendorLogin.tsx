import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedInviteCode = inviteCode.trim();

      console.log("Attempting login with:", { email: trimmedEmail, invite_code: trimmedInviteCode });

      // Validate vendor token (invite code)
      const result = await apiValidateVendorToken(trimmedInviteCode);

      if (!result) {
        console.error("Validation failed - invite code not found in system");
        toast.error("Invalid invite code. Please check your invite code and try again.");
        throw new Error("Invalid invite code");
      }

      console.log("[VendorLogin] Validation successful - invite found:", {
        email: result.invite.vendor_email,
        company: result.invite.vendor_company,
        auction_id: result.auction.id,
      });

      // Verify email matches (case-insensitive)
      if (result.invite.vendor_email.toLowerCase() !== trimmedEmail) {
        toast.error("Email does not match invite code");
        throw new Error("Email mismatch");
      }

      console.log("Login successful:", result);
      toast.success("Login successful!");

      // Create session object
      const session = {
        session_token: trimmedInviteCode,
        vendor_email: trimmedEmail,
        vendor_company: result.invite.vendor_company,
        auction_id: result.auction.id,
      };

      onLogin(session, result.auction.id);
    } catch (error: any) {
      console.error("Login error:", error);
      // Error already shown above
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
          onClick={() => setShowDebug(!showDebug)}
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
                placeholder="abc123xyz"
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
