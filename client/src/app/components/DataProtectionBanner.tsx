import React from "react";
import { AlertTriangle, Shield, Info } from "lucide-react";

interface DataProtectionBannerProps {
  variant?: "warning" | "info" | "success";
  message?: string;
}

export function DataProtectionBanner({
  variant = "info",
  message,
}: DataProtectionBannerProps) {
  const variants = {
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-950 border-yellow-500",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      textColor: "text-yellow-800 dark:text-yellow-200",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950 border-blue-500",
      icon: Info,
      iconColor: "text-blue-600",
      textColor: "text-blue-800 dark:text-blue-200",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950 border-green-500",
      icon: Shield,
      iconColor: "text-green-600",
      textColor: "text-green-800 dark:text-green-200",
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  const defaultMessage =
    variant === "success"
      ? "✅ Your data is automatically backed up every 15 minutes and stored in your browser's localStorage."
      : "⚠️ Important: Your data is stored in browser localStorage. Clearing browser data or using incognito mode may cause data loss. Export backups regularly.";

  return (
    <div className={`border-l-4 p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`}
        />
        <p className={`text-sm ${config.textColor}`}>
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
}
