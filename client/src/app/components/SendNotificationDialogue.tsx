// File: src/app/components/SendNotificationDialogue.tsx

"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { addNotification } from "@/lib/notifications";
import { toast } from "sonner";

interface SendNotificationDialogProps {
  vendorEmail: string;
  vendorName?: string;
  auctionId: string;
  adminRole?: "product_owner" | "global_admin" | "internal_user" | "external_guest";
}

export function SendNotificationDialog({
  vendorEmail,
  vendorName,
  auctionId,
  adminRole,
}: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Only Product Owner and Global Admin can send messages
  // If adminRole is undefined, allow it (backwards compatible)
  const canSendMessages =
    !adminRole || adminRole === "product_owner" || adminRole === "global_admin";

  const handleSend = async (): Promise<void> => {
    if (!canSendMessages) {
      toast.error("You do not have permission to send messages");
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both title and message");
      return;
    }

    setSending(true);
    try {
      await Promise.resolve(
        addNotification({
          vendor_email: vendorEmail,
          auction_id: auctionId,
          type: "admin_message",
          title: `📬 ${title}`,
          message,
          sender: "Emerson Procurement Team",
        } as any),
      );

      toast.success(`Notification sent to ${vendorName || vendorEmail}`);
      setTitle("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          disabled={!canSendMessages}
          title={canSendMessages ? "Send message to vendor" : "View only - no send permission"}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          {canSendMessages ? "Message" : "View"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-131.25">
        <DialogHeader>
          <DialogTitle>
            {canSendMessages ? "Send Notification to Vendor" : "View Vendor Communication"}
          </DialogTitle>
          <DialogDescription>
            {canSendMessages ? (
              <>
                Send a message to{" "}
                <span className="font-semibold">{vendorName || vendorEmail}</span>
              </>
            ) : (
              <>You have view-only access. Only Product Owners and Global Administrators can send messages.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Update your bid"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={!canSendMessages}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder={
                canSendMessages
                  ? "Enter your message to the vendor..."
                  : "Messaging is disabled for your role"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
              disabled={!canSendMessages}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {message.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {canSendMessages ? "Cancel" : "Close"}
          </Button>
          {canSendMessages && (
            <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}