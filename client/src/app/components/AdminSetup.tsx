// File: src/app/components/AdminSetup.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Copy, Check, ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiCreateAuction, apiCreateInvites } from "@/lib/api/api";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface PartNumber {
  id: string;
  part_number: string;
  quantity: string;
}

type AdminSession = {
  name: string;
  email: string;
};

type Invite = {
  email: string;
  company_name: string;
  status: "pending" | "accessed" | "submitted" | string;
};

interface AdminSetupProps {
  onComplete: () => void;
  adminSession: AdminSession;
}

type FormDataState = {
  date_requested: string;
  requestor: string;
  requestor_email: string;
  group_site: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  event_type: "" | "ORDER" | "QUOTE";
  target_lead_time: string;
  notes: string;
};

export function AdminSetup({ onComplete, adminSession }: AdminSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormDataState>({
    date_requested: new Date().toISOString().split("T")[0],
    requestor: adminSession?.name ?? "",
    requestor_email: adminSession?.email ?? "",
    group_site: "",
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "",
    target_lead_time: "",
    notes: "",
  });

  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([
    { id: "1", part_number: "", quantity: "" },
  ]);

  const [vendorEmails, setVendorEmails] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [copied, setCopied] = useState(false);

  const addPartNumber = (): void => {
    setPartNumbers((prev) => [
      ...prev,
      { id: Date.now().toString(), part_number: "", quantity: "" },
    ]);
  };

  const removePartNumber = (id: string): void => {
    setPartNumbers((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  const updatePartNumber = (
    id: string,
    field: "part_number" | "quantity",
    value: string
  ): void => {
    setPartNumbers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleNext = (): void => {
    if (step === 1) {
      if (
        !formData.group_site ||
        !formData.name ||
        !formData.description ||
        !formData.start_date ||
        !formData.end_date ||
        !formData.event_type ||
        !formData.target_lead_time
      ) {
        toast.error("All required fields must be completed");
        return;
      }

      const validParts = partNumbers.filter(
        (p) => p.part_number.trim() && p.quantity.trim()
      );
      if (validParts.length === 0) {
        toast.error("At least one part number is required");
        return;
      }
    }

    if (step === 2) {
      const emails = vendorEmails
        .split(/[,\n]/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e.includes("@"));

      if (!emails.length) {
        toast.error("Enter at least one valid email");
        return;
      }

      setInvites(
        emails.map((email) => ({
          email,
          company_name: "External Guest",
          status: "pending",
        }))
      );
    }

    setStep((prev) => (prev === 1 ? 2 : 3));
  };

  const handleBack = (): void => {
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const copyVendorList = async (): Promise<void> => {
    if (invites.length === 0) {
      toast.error("No vendor emails to copy");
      return;
    }

    const text = invites.map((i) => i.email).join("\n");
    const ok = await copyToClipboard(text);

    if (ok) {
      setCopied(true);
      toast.success("Vendor list copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Failed to copy");
    }
  };

  const launchAuction = async (): Promise<void> => {
    if (loading) return;

    if (!adminSession?.email) {
      toast.error("Admin email is required to create an auction");
      return;
    }

    if (!invites.length) {
      toast.error("Add at least one vendor before launching");
      return;
    }

    setLoading(true);

    try {
      const validParts = partNumbers.filter(
        (p) => p.part_number.trim() && p.quantity.trim()
      );

      if (validParts.length === 0) {
        toast.error("At least one part number with quantity is required");
        return;
      }

      /**
       * ✅ IMPORTANT:
       * Your server POST /api/auctions requires created_by_admin_email (snake_case).
       * Some versions also accept createdByAdminEmail (camelCase).
       * Send BOTH to be safe and eliminate 400s.
       */
      const auctionPayload = {
        title: formData.name,
        description: formData.description,
        status: "active",
        product_details: validParts
          .map((p) => `${p.part_number}: ${p.quantity}`)
          .join("; "),
        quantity: validParts.length,
        unit: "parts",
        delivery_location: formData.group_site,
        starts_at: new Date(formData.start_date).toISOString(),
        ends_at: new Date(formData.end_date).toISOString(),
        winner_vendor_email: null,

        // existing metadata (keep)
        created_by_email: adminSession.email,
        created_by_company: adminSession.name,
        admin_id: adminSession.email,

        // ✅ required by backend
        created_by_admin_email: adminSession.email,
        // ✅ accepted by some backend variants
        createdByAdminEmail: adminSession.email,

        // extra fields (keep for DB/model compatibility)
        date_requested: formData.date_requested,
        requestor: formData.requestor,
        requestor_email: formData.requestor_email,
        group_site: formData.group_site,
        event_type: formData.event_type,
        target_lead_time: formData.target_lead_time,
        notes: formData.notes,
      };

      const auction = await apiCreateAuction(auctionPayload as any);

      await apiCreateInvites(
        auction.id,
        invites.map((i) => ({
          email: i.email,
          company: i.company_name,
        })),
        "manual"
      );

      toast.success(`Auction launched with ${invites.length} vendor invitations`);
      onComplete();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "Failed to launch auction";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Event Details</CardTitle>
            <CardDescription>Define auction basics</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <Label>Group / Site *</Label>

              <Select
                value={formData.group_site}
                onValueChange={(v) =>
                  setFormData({ ...formData, group_site: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="MTWN">MTWN – Marshalltown</SelectItem>
                  <SelectItem value="STL">STL – St. Louis</SelectItem>
                  <SelectItem value="BOUL">BOUL – Boulder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Type *</Label>

              <Select
                value={formData.event_type}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    event_type: v as FormDataState["event_type"],
                  })
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ORDER">ORDER (Binding award)</SelectItem>
                  <SelectItem value="QUOTE">QUOTE (PO for review)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Target Lead Time (days) *</Label>
              <Input
                type="number"
                className="max-w-xs"
                value={formData.target_lead_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_lead_time: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Part Numbers *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addPartNumber}
                  type="button"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {partNumbers.map((p) => (
                <div key={p.id} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Part #"
                    value={p.part_number}
                    onChange={(e) =>
                      updatePartNumber(p.id, "part_number", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Qty"
                    value={p.quantity}
                    onChange={(e) =>
                      updatePartNumber(p.id, "quantity", e.target.value)
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={partNumbers.length === 1}
                    onClick={() => removePartNumber(p.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <Button onClick={handleNext} className="w-full" type="button">
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Vendor Emails</CardTitle>
            <CardDescription>
              Paste vendor emails (comma or line separated)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Textarea
              rows={6}
              placeholder="vendor1@email.com, vendor2@email.com"
              value={vendorEmails}
              onChange={(e) => setVendorEmails(e.target.value)}
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} type="button">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <Button onClick={handleNext} type="button">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review &amp; Launch</CardTitle>
            <CardDescription>
              Review invitation details and launch the auction
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Vendor Invitations ({invites.length})
              </h3>

              <Button
                size="sm"
                variant="outline"
                onClick={copyVendorList}
                type="button"
                disabled={invites.length === 0}
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied" : "Copy Emails"}
              </Button>
            </div>

            <div className="space-y-2">
              {invites.map((invite, index) => (
                <div
                  key={`${invite.email}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Invite code will be generated after submission
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={step === 3 ? launchAuction : handleNext}
            disabled={loading}
            type="button"
          >
            {loading ? "Processing..." : step === 3 ? "Submit & Launch" : "Next"}
            {step < 3 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}