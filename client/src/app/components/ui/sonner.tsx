// File: client/src/app/components/ui/sonner.tsx
"use client";

import type { ComponentProps } from "react";
import { Toaster as SonnerToaster } from "sonner";

type Props = ComponentProps<typeof SonnerToaster>;

/**
 * Wrapper so your app can import:
 *   import { Toaster } from "@/app/components/ui/sonner";
 */
export function Toaster(props: Props) {
  return <SonnerToaster theme="system" richColors closeButton {...props} />;
}