// File: client/src/app/components/AdminSetup.tsx
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
import { ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiCreateAuction, apiCreateInvites } from "@/lib/api";
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

interface AdminSetupProps {
  onComplete: () => void;
  adminSession: any;
}

type Step = 1 | 2 | 3;

type InviteRow = {
  email: string;
  company_name: string;
  status: "pending" | string;
};

export function AdminSetup({ onComplete, adminSession }: AdminSetupProps) {
  const [step, setStep] = useState<Step>(1);

  const [formData, setFormData] = useState({
    date_requested: new Date().toISOString().split("T")[0],
    requestor: adminSession?.name || "Current User",
    requestor_email: adminSession?.email || "admin@emerson.com",
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
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  const validateStep1 = (): boolean => {
    if (!formData.group_site || !formData.name || !formData.description) {
      toast.error("Group/Site, Name, and Description are required");
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error("Start and End dates are required");
      return false;
    }

    if (!formData.event_type) {
      toast.error("Event Type is required");
      return false;
    }

    if (!formData.target_lead_time) {
      toast.error("Target Lead Time is required");
      return false;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    if (endDate <= startDate) {
      toast.error("End date must be after start date");
      return false;
    }

    const validParts = partNumbers.filter(
      (p) => p.part_number.trim() && p.quantity.trim()
    );
    if (validParts.length === 0) {
      toast.error("At least one part number with quantity is required");
      return false;
    }

    const totalQty = validParts.reduce((sum, p) => {
      const n = Number.parseInt(p.quantity, 10);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    if (totalQty <= 0) {
      toast.error("Total quantity must be greater than 0");
      return false;
    }

    return true;
  };

  const handleNext = (): void => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      const emails = vendorEmails
        .split(/[,\n]/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e.includes("@"));

      if (emails.length === 0) {
        toast.error("Please enter at least one valid email address");
        return;
      }

      // de-dupe preserving order
      const seen = new Set<string>();
      const deduped = emails.filter((e) => {
        if (seen.has(e)) return false;
        seen.add(e);
        return true;
      });

      setInvites(
        deduped.map((email) => ({
          email,
          company_name: "External Guest",
          status: "pending",
        }))
      );

      setStep(3);
      return;
    }

    // step 3 uses Submit action only
  };

  const handleBack = (): void => {
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const handleSubmit = async (): Promise<void> => {
    await launchAuction();
  };

  // ✅ CHANGE REQUESTED: remove draft path entirely (always launch active)
  const launchAuction = async (): Promise<void> => {
    if (loading) return;

    if (!adminSession?.email) {
      toast.error("Admin email is required");
      return;
    }

    if (invites.length === 0) {
      toast.error("Add at least one External Guest before submitting");
      return;
    }

    setLoading(true);

    try {
      const validParts = partNumbers.filter(
        (p) => p.part_number.trim() && p.quantity.trim()
      );

      const totalQty = validParts.reduce((sum, p) => {
        const n = Number.parseInt(p.quantity, 10);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);

      const productDetails = validParts
        .map((p) => `${p.part_number.trim()}: ${p.quantity.trim()}`)
        .join("; ");

      const startsAtIso = new Date(formData.start_date).toISOString();
      const endsAtIso = new Date(formData.end_date).toISOString();

      const auctionPayload = {
        title: formData.name,
        description: formData.description,
        status: "active", // ✅ always active (draft removed)
        product_details: productDetails,
        quantity: totalQty,
        unit: "EA",
        delivery_location: formData.group_site,
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        winner_vendor_email: null,

        // Admin / request metadata
        created_by_email: adminSession.email,
        created_by_company: adminSession.name,

        date_requested: formData.date_requested,
        requestor: formData.requestor,
        requestor_email: formData.requestor_email,
        group_site: formData.group_site,
        event_type: formData.event_type,
        target_lead_time: formData.target_lead_time,
        notes: formData.notes,
      };

      const createdAuction = await apiCreateAuction(auctionPayload as any);

      const auctionId =
        (createdAuction as any)?.id ??
        (createdAuction as any)?.auction?.id ??
        (createdAuction as any)?.auction_id;

      if (!auctionId) {
        throw new Error("Auction created but no id was returned by server");
      }

      const vendorsToInvite = invites.map((i) => ({
        email: i.email,
        company: i.company_name,
      }));

      await apiCreateInvites(String(auctionId), vendorsToInvite, "manual");

      // ✅ CHANGE REQUESTED: remove draft messaging
      toast.success(`Auction launched with ${invites.length} External Guest invitations!`);

      onComplete();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as any).message)
          : "Unknown error";
      console.error("Launch error:", error);

      // ✅ CHANGE REQUESTED: remove draft messaging
      toast.error(`Failed to launch auction: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container mx-auto px-4 py-8 max-w-4xl"
      style={{ maxWidth: "1180px" }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          New Auction Request
        </h1>

        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded ${
                s <= step
                  ? "bg-[#00573d] dark:bg-[#00805a]"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Basic Info & Event Details</CardTitle>
            <CardDescription>Define the auction parameters</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Auto-populated fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  Date Requested
                </Label>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formData.date_requested}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  Requestor
                </Label>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formData.requestor}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  Requestor Email
                </Label>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formData.requestor_email}
                </div>
              </div>
            </div>

            {/* Group/Site */}
            <div>
              <Label htmlFor="group_site">Group/Site *</Label>
              <Select
                value={formData.group_site}
                onValueChange={(value) =>
                  setFormData({ ...formData, group_site: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group/site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN – Marshalltown, IA</SelectItem>
                  <SelectItem value="MTWN">MTWN – Marshalltown, IA</SelectItem>
                  <SelectItem value="SMR">SMR – Summer, WA</SelectItem>
                  <SelectItem value="RRC">RRC – Rochester, NY</SelectItem>
                  <SelectItem value="STL">STL – St. Louis, MO</SelectItem>
                  <SelectItem value="BOUL">BOUL – Boulder, CO</SelectItem>
                  <SelectItem value="SJO">SJO – San Jose, CA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">Name (Title of this event) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Industrial Safety Equipment Q1 2026"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Details of this event) *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed requirements, specifications, and expectations..."
                rows={4}
              />
            </div>

            {/* Event Type */}
            <div>
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, event_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER">ORDER - Firm commitment to purchase</SelectItem>
                  <SelectItem value="QUOTE">QUOTE - Request for quotation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Target Lead Time */}
            <div>
              <Label htmlFor="target_lead_time">
                Target Lead Time (ARO - After Receipt of Order) *
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                    id="target_lead_time"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.target_lead_time}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D+/g, "");
                      setFormData({ ...formData, target_lead_time: digitsOnly });
                    }}
                    placeholder="e.g., 30"
                    className="max-w-xs"
                  />
                <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
              </div>
            </div>

            {/* Part Numbers & Quantities */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Part Numbers & Quantities *</Label>
                <Button size="sm" variant="outline" onClick={addPartNumber} type="button">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Part
                </Button>
              </div>

              <div className="space-y-2">
                {partNumbers.map((part) => (
                  <div key={part.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Part Number"
                      value={part.part_number}
                      onChange={(e) =>
                        updatePartNumber(part.id, "part_number", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Quantity"
                      value={part.quantity}
                      onChange={(e) =>
                        updatePartNumber(part.id, "quantity", e.target.value)
                      }
                      className="w-32"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePartNumber(part.id)}
                      disabled={partNumbers.length === 1}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: External Guest Emails</CardTitle>
            <CardDescription>
              Paste External Guest email addresses (one per line or comma-separated).
              External Guests will provide their company info when they log in.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vendor_emails">External Guest Email Addresses *</Label>
              <Textarea
                id="vendor_emails"
                value={vendorEmails}
                onChange={(e) => setVendorEmails(e.target.value)}
                placeholder={`guest1@company.com
guest2@company.com
guest3@company.com
Or comma-separated: guest1@company.com, guest2@company.com`}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Tip: Paste one email per line, or separate with commas. External Guests will
                enter their company name and contact details when they log in to place their bid.
              </p>
            </div>

            {vendorEmails.trim() && (
              <div className="p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Preview:</strong>{" "}
                  {
                    vendorEmails
                      .split(/[,\n]/)
                      .filter((e) => e.trim() && e.includes("@")).length
                  }{" "}
                  valid email(s) detected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review & Launch</CardTitle>
            <CardDescription>Review invitation details and launch the auction</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                Auction Summary
              </h3>

              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Group/Site:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.group_site}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Event Type:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.event_type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Target Lead Time:
                  </span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.target_lead_time} days
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Duration:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(formData.start_date).toLocaleString()} →{" "}
                    {new Date(formData.end_date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Vendors:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {invites.length}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Vendor Invitations ({invites.length} External Guests)
              </h3>

              <div className="space-y-2">
                {invites.map((invite, index) => (
                  <div
                    key={`${invite.email}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invite.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Invite link/code will be generated after submission
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>📋 Next Step:</strong> After you submit, you'll see the Admin
                  Dashboard where you can copy invite codes and send them to vendors.
                </p>
              </div>

              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-sm text-gray-900 dark:text-white">
                  <strong>Note:</strong> Vendor communications should include only the event
                  link/code, timing, and part numbers/quantities (avoid internal preferences).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={loading} type="button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* ✅ CHANGE REQUESTED: Save as Draft removed */}
          <Button
            onClick={step === 3 ? handleSubmit : handleNext}
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