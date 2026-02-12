/**
 * Data Persistence and Backup Utilities
 * Ensures data is never lost and can be recovered
 */

import { kv } from "./supabase";
import { toast } from "sonner";

const BACKUP_PREFIX = "speedsourcing_backup:";
const LAST_BACKUP_KEY = "speedsourcing:last_backup_timestamp";
const DATA_HASH_KEY = "speedsourcing:data_hash";

export interface BackupData {
  timestamp: string;
  admins: any[];
  auctions: any[];
  invites: any[];
  bids: any[];
}

function generateDataHash(data: any): string {
  return btoa(JSON.stringify(data)).substring(0, 32);
}

export function setupDataMonitoring(): () => void {
  let lastDataHash = localStorage.getItem(DATA_HASH_KEY) || "";

  const checkInterval = setInterval(async () => {
    try {
      const admins = (await kv.get("admins")) || [];
      const auctions = (await kv.get("auctions")) || [];
      const invites = (await kv.get("invites")) || [];
      const bids = (await kv.get("bids")) || [];

      const currentData = { admins, auctions, invites, bids };
      const currentHash = generateDataHash(currentData);

      if (lastDataHash && lastDataHash !== currentHash) {
        const emptyHash = generateDataHash({
          admins: [],
          auctions: [],
          invites: [],
          bids: [],
        });

        if (lastDataHash !== emptyHash && currentHash === emptyHash) {
          toast.error(
            "Data loss detected! Open Debug Storage to restore from backup.",
            { duration: 10000 }
          );
        }
      }

      lastDataHash = currentHash;
      localStorage.setItem(DATA_HASH_KEY, currentHash);
    } catch (error) {
      console.error("[DataProtection] Monitoring error:", error);
    }
  }, 5000);

  return () => clearInterval(checkInterval);
}

export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    admins: (await kv.get("admins")) || [],
    auctions: (await kv.get("auctions")) || [],
    invites: (await kv.get("invites")) || [],
    bids: (await kv.get("bids")) || [],
  };

  const key = `${BACKUP_PREFIX}${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(backup));
  localStorage.setItem(LAST_BACKUP_KEY, backup.timestamp);

  await cleanOldBackups();
  return backup;
}

export function getAllBackups(): BackupData[] {
  const backups: BackupData[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) {
      try {
        backups.push(JSON.parse(localStorage.getItem(key) || ""));
      } catch {}
    }
  }

  return backups.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );
}

export function getLatestBackup(): BackupData | null {
  const backups = getAllBackups();
  return backups.length ? backups[0] : null;
}

export async function restoreFromBackup(backup: BackupData): Promise<void> {
  await kv.set("admins", backup.admins);
  await kv.set("auctions", backup.auctions);
  await kv.set("invites", backup.invites);
  await kv.set("bids", backup.bids);
}

async function cleanOldBackups(): Promise<void> {
  const backups = getAllBackups();
  const toDelete = backups.slice(10);

  for (const backup of toDelete) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BACKUP_PREFIX)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || "");
          if (parsed.timestamp === backup.timestamp) {
            localStorage.removeItem(key);
            break;
          }
        } catch {}
      }
    }
  }
}
