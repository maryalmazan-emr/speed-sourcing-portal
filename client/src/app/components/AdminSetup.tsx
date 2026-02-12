import React, { useState } from "react";
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
import {
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiCreateAuction, apiCreateInvites } from "@/lib/api";
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

interface AdminSetupProps {
  onComplete: () => void;
  adminSession: any;
}

export function AdminSetup({ onComplete, adminSession }: AdminSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    date_requested: new Date().toISOString().split("T")[0],
    requestor: adminSession.name,
    requestor_email: adminSession.email,
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
  const [invites, setInvites] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const addPartNumber = () => {
    setPartNumbers([
      ...partNumbers,
      { id: Date.now().toString(), part_number: "", quantity: "" },
    ]);
  };

  const removePartNumber = (id: string) => {
    if (partNumbers.length > 1) {
      setPartNumbers(partNumbers.filter(p => p.id !== id));
    }
  };

  const updatePartNumber = (
    id: string,
    field: "part_number" | "quantity",
    value: string
  ) => {
    setPartNumbers(
      partNumbers.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const handleNext = () => {
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

      const validParts = partNumbers.filter(p => p.part_number && p.quantity);
      if (validParts.length === 0) {
        toast.error("At least one part number is required");
        return;
      }
    }

    if (step === 2) {
      const emails = vendorEmails
        .split(/[,\n]/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes("@"));

      if (!emails.length) {
        toast.error("Enter at least one valid email");
        return;
      }

      setInvites(
        emails.map(email => ({
          email,
          company_name: "External Guest",
          status: "pending",
        }))
      );
    }

    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const copyVendorList = async () => {
    if (invites.length === 0) {
      toast.error("No vendor emails to copy");
      return;
    }

    const text = invites.map(i => i.email).join("\n");
    const ok = await copyToClipboard(text);

    if (ok) {
      setCopied(true);
      toast.success("Vendor list copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Failed to copy");
    }
  };

  const launchAuction = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const validParts = partNumbers.filter(p => p.part_number && p.quantity);

      const auction = await apiCreateAuction({
        title: formData.name,
        description: formData.description,
        product_details: validParts
          .map(p => `${p.part_number}: ${p.quantity}`)
          .join("; "),
        quantity: validParts.length,
        unit: "parts",
        delivery_location: formData.group_site,
        starts_at: new Date(formData.start_date).toISOString(),
        ends_at: new Date(formData.end_date).toISOString(),
        created_by_email: adminSession.email,
        created_by_company: adminSession.name,
        admin_id: adminSession.email,
        date_requested: formData.date_requested,
        requestor: formData.requestor,
        requestor_email: formData.requestor_email,
        group_site: formData.group_site,
        event_type: formData.event_type,
        target_lead_time: formData.target_lead_time,
        notes: formData.notes,
      } as any);

      await apiCreateInvites(
        auction.id,
        invites.map(i => ({
          email: i.email,
          company: i.company_name,
        })),
        "manual"
      );

      toast.success(`Auction launched with ${invites.length} vendor invitations`);
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to launch auction");
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
                onValueChange={v =>
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
              <Label>Event Name *</Label>
              <Input
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={e =>
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
                  onChange={e =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={e =>
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
                onChange={e =>
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
                <Button size="sm" variant="outline" onClick={addPartNumber}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {partNumbers.map(p => (
                <div key={p.id} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Part #"
                    value={p.part_number}
                    onChange={e =>
                      updatePartNumber(p.id, "part_number", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Qty"
                    value={p.quantity}
                    onChange={e =>
                      updatePartNumber(p.id, "quantity", e.target.value)
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={partNumbers.length === 1}
                    onClick={() => removePartNumber(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={handleNext} className="w-full">
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
              onChange={e => setVendorEmails(e.target.value)}
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <Button onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review & Launch</CardTitle>
            <CardDescription>
              Review invitation details and launch the auction
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                Auction Summary
              </h3>

              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Name:
                  </span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.name}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Group/Site:
                  </span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.group_site}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Event Type:
                  </span>{" "}
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
                  <span className="text-gray-600 dark:text-gray-400">
                    Duration:
                  </span>{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(formData.start_date).toLocaleString()} →{" "}
                    {new Date(formData.end_date).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Vendors:
                  </span>{" "}
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
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invite.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Invite code will be generated after submission
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>📋 Next Step:</strong> After you submit, you’ll be taken
                  to the Admin Dashboard where you can copy invite codes and send
                  them to vendors.
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-gray-900 dark:text-white">
                <strong>Note:</strong> Invitation emails include Event ID,
                Requestor, End Date, Target Lead Time, Part Numbers &amp;
                Quantities, and a link to the live auction.
                {formData.event_type === "ORDER" &&
                  " This is a firm ORDER — the winning bid will be binding."}
                {formData.event_type === "QUOTE" &&
                  " This is a QUOTE request — the winning bid will receive a PO for review."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
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
          >
            {loading
              ? "Processing..."
              : step === 3
              ? "Submit & Launch"
              : "Next"}
            {step < 3 && (
              <ArrowRight className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

