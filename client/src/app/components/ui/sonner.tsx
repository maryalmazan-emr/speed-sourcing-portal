// client/src/app/components/ui/sonner.tsx
import React from "react";
import { Toaster as SonnerToaster } from "sonner";

type Props = React.ComponentProps<typeof SonnerToaster>;

/**
 * Wrapper so your app can import:
 *   import { Toaster } from "@/app/components/ui/sonner";
 */
export function Toaster(props: Props) {
  return (
    <SonnerToaster
      theme="system"
      richColors
      closeButton
      {...props}
    />
  );
}