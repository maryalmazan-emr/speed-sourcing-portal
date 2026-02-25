"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1",
    "rounded-md border px-2 py-0.5",
    "text-xs font-medium whitespace-nowrap shrink-0",
    "transition-[color,box-shadow]",
    "focus-visible:outline-none focus-visible:ring-[3px]",
    "focus-visible:ring-ring/50",
    "[&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary / default badge */
        default:
          "bg-primary text-primary-foreground border-primary",

        /** Secondary informational badge */
        secondary:
          "bg-secondary text-secondary-foreground border-secondary",

        /** Destructive / error badge */
        destructive:
          "bg-destructive text-destructive-foreground border-destructive " +
          "focus-visible:ring-destructive/30",

        /** Neutral outline badge */
        outline:
          "bg-transparent text-foreground border-border " +
          "hover:bg-accent hover:text-accent-foreground",

        /** ✅ Active status (WCAG-safe in dark mode) */
        active:
          "bg-blue-600 text-white border-blue-600 " +
          "dark:bg-blue-500 dark:text-black",

        /** ✅ Success / awarded */
        success:
          "bg-emerald-600 text-white border-emerald-600 " +
          "dark:bg-emerald-500 dark:text-black",

        /** ✅ Muted / scheduled / inactive */
        muted:
          "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  };

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };