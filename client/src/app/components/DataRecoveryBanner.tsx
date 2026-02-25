// File: client/src/app/components/DataRecoveryBanner.tsx

"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle, Upload, RefreshCw } from "lucide-react";
import {
  getAllBackups,
  restoreFromBackup,
  importDataFromFile,
  type BackupData,
} from "@/lib/dataProtection";
import { toast } from "sonner";
import { kv } from "@/lib/kv";

export function DataRecoveryBanner() {
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkForData();
  }, []);

  const checkForData = async (): Promise<void> => {
    try {
      const admins = await kv.get("admins");
      const auctions = await kv.get("auctions");

      const hasAnyData =
        (Array.isArray(admins) && admins.length > 0) ||
        (Array.isArray(auctions) && auctions.length > 0);

      setHasData(hasAnyData);

      if (!hasAnyData) {
        setBackups(getAllBackups());
      }
    } catch (error) {
      console.error("[DataRecoveryBanner] Error checking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backup: BackupData): Promise<void> => {
    const confirmed = window.confirm(
      `Restore data from backup?\n\nBackup from: ${new Date(backup.timestamp).toLocaleString()}`
    );

    if (!confirmed) return;

    try {
      await restoreFromBackup(backup);
      toast.success("Data restored successfully! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("[DataRecoveryBanner] Restore error:", error);
      toast.error("Error restoring backup");
    }
  };

  const handleImportFile = (): void => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        await importDataFromFile(file);
        toast.success("Data imported successfully! Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error("[DataRecoveryBanner] Import error:", error);
        toast.error("Invalid backup file");
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

            {backups.length > 0 ? (
              <div className="space-y-2">
                {backups.map((backup, idx) => (
                  <div
                    key={backup.timestamp}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {new Date(backup.timestamp).toLocaleString()}
                        {idx === 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {backup.admins.length} admins • {backup.auctions.length} auctions •{" "}
                        {backup.invites.length} invites • {backup.bids.length} bids
                      </div>
                    </div>

                    <Button size="sm" onClick={() => void handleRestoreBackup(backup)} type="button">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportFile}
                  className="bg-white dark:bg-gray-800"
                  type="button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Backup File
                </Button>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}