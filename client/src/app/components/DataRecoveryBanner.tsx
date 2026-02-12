import React, { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import {
  getAllBackups,
  restoreFromBackup,
  importDataFromFile,
  type BackupData,
} from "@/lib/dataProtection";
import { toast } from "sonner";
import { kv } from "@/lib/supabase";

export function DataRecoveryBanner() {
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForData();
  }, []);

  const checkForData = async () => {
    try {
      const admins = await kv.get("admins");
      const auctions = await kv.get("auctions");

      const hasAnyData =
        (Array.isArray(admins) && admins.length > 0) ||
        (Array.isArray(auctions) && auctions.length > 0);

      setHasData(hasAnyData);

      if (!hasAnyData) {
        const availableBackups = getAllBackups();
        setBackups(availableBackups);
      }
    } catch (error) {
      console.error("[DataRecoveryBanner] Error checking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backup: BackupData) => {
    const confirmed = window.confirm(
      `Restore data from backup?\n\nBackup from: ${new Date(
        backup.timestamp
      ).toLocaleString()}\n\n` +
        `This backup contains:\n` +
        `• ${backup.admins.length} admin accounts\n` +
        `• ${backup.auctions.length} auctions\n` +
        `• ${backup.invites.length} invites\n` +
        `• ${backup.bids.length} bids`
    );

    if (!confirmed) return;

    try {
      await restoreFromBackup(backup);
      toast.success("Data restored successfully! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("[DataRecoveryBanner] Error restoring backup:", error);
      toast.error("Error restoring backup");
    }
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      try {
        await importDataFromFile(file);
        toast.success("Data imported successfully! Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error("[DataRecoveryBanner] Error importing:", error);
        toast.error(
          "Error importing data. Please check the file format."
        );
      }
    };

    input.click();
  };

  if (loading || hasData) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <Alert
        variant="destructive"
        className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
      >
        <AlertTriangle className="h-5 w-5 text-yellow-600" />

        <AlertTitle className="text-yellow-900 dark:text-yellow-100">
          Data Not Found – Recovery Options Available
        </AlertTitle>

        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <div className="space-y-3 mt-2">
            <p>Your browser&apos;s localStorage appears to be empty.</p>

            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li>Browser cache was cleared</li>
              <li>You&apos;re using a different browser or device</li>
              <li>You&apos;re in incognito/private mode</li>
              <li>The Figma Make environment was reset</li>
            </ul>

            {backups.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="font-semibold">
                  ✅ {backups.length} automatic backup
                  {backups.length > 1 ? "s" : ""} found
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {backups.map((backup, idx) => (
                    <div
                      key={backup.timestamp}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date(
                            backup.timestamp
                          ).toLocaleString()}
                          {idx === 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded">
                              Latest
                            </span>
                          )}
                        </div>

                        <div className="text-gray-600 dark:text-gray-400">
                          {backup.admins.length} admins •{" "}
                          {backup.auctions.length} auctions •{" "}
                          {backup.invites.length} invites •{" "}
                          {backup.bids.length} bids
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() =>
                          handleRestoreBackup(backup)
                        }
                        className="ml-4"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="font-semibold mb-2">
                  ⚠️ No automatic backups found
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportFile}
                  className="bg-white dark:bg-gray-800"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Backup File
                </Button>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold">
                🛡️ Prevent Future Data Loss
              </p>
              <ul className="text-sm list-disc list-inside ml-2 mt-1 space-y-1">
                <li>Export data regularly</li>
                <li>Keep JSON backups</li>
                <li>Avoid clearing browser data</li>
                <li>Use the same browser/device</li>
              </ul>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}