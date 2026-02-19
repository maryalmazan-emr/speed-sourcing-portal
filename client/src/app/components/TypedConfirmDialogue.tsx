// File: src/app/components/TypedConfirmDialogue.tsx

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface TypedConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // ✅ FIX: allow any return type (toast returns string|number, etc.)
  onConfirm: () => void | Promise<unknown>;

  title: string;
  description: string;

  confirmText: string;
  confirmButtonText?: string;
  variant?: "destructive" | "default";
}

export function TypedConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  confirmButtonText = "Confirm",
  variant = "destructive",
}: TypedConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = async (): Promise<void> => {
    if (inputValue !== confirmText) return;

    await Promise.resolve(onConfirm());
    setInputValue("");
    onOpenChange(false);
  };

  const handleCancel = (): void => {
    setInputValue("");
    onOpenChange(false);
  };

  const isValid = inputValue === confirmText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === "destructive" && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="confirm-input" className="text-sm font-medium mb-2 block">
            Type{" "}
            <span className="font-mono font-bold text-red-600">"{confirmText}"</span>{" "}
            to confirm
          </Label>

          <Input
            id="confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            className={`font-mono ${
              inputValue && !isValid
                ? "border-red-500 focus-visible:ring-red-500"
                : isValid
                ? "border-green-500 focus-visible:ring-green-500"
                : ""
            }`}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) {
                void handleConfirm();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />

          {inputValue && !isValid && (
            <p className="text-xs text-red-600 mt-1">
              Text does not match. Please type exactly: "{confirmText}"
            </p>
          )}

          {isValid && (
            <p className="text-xs text-green-600 mt-1">✓ Confirmed</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={() => void handleConfirm()}
            disabled={!isValid}
          >
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}