// File: src/lib/dataProtection.ts
/**
 * Data Persistence and Backup Utilities
 *
 * Purpose:
 * - Detect accidental local data loss
 * - Create rolling local backups
 * - Restore data from backups or imported files
 *
 * IMPORTANT:
 * - Azure SQL is the source of truth
 * - This file ONLY handles client-side safety & recovery
 * - No Supabase, no server dependencies
 */

import { kv } from "@/lib/kv";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const BACKUP_PREFIX = "speedsourcing:backup:";
const DATA_HASH_KEY = "speedsourcing:data_hash";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface BackupData {
  timestamp: number;
  admins: unknown[];
  auctions: unknown[];
  invites: unknown[];
  bids: unknown[];
}

export interface DataIntegrityResult {
  issues?: string[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateDataHash(data: unknown): string {
  try {
    return btoa(JSON.stringify(data)).slice(0, 32);
  } catch {
    return "";
  }
}

/**
 * kv.get() is currently typed in your project such that TS treats it like `{}`.
 * To keep TypeScript safe and avoid `.length` errors, coerce all values into arrays.
 */
async function kvArray(key: string): Promise<unknown[]> {
  const v: unknown = await (kv as any).get(key);
  return Array.isArray(v) ? v : [];
}

/* ------------------------------------------------------------------ */
/* Data monitoring (loss detection)                                   */
/* ------------------------------------------------------------------ */

export function setupDataMonitoring(): () => void {
  let lastDataHash = localStorage.getItem(DATA_HASH_KEY) || "";

  const interval = setInterval(async () => {
    try {
      const admins = await kvArray("admins");
      const auctions = await kvArray("auctions");
      const invites = await kvArray("invites");
      const bids = await kvArray("bids");

      const currentData = { admins, auctions, invites, bids };
      const currentHash = generateDataHash(currentData);

      const emptyHash = generateDataHash({
        admins: [],
        auctions: [],
        invites: [],
        bids: [],
      });

      if (
        lastDataHash &&
        lastDataHash !== currentHash &&
        lastDataHash !== emptyHash &&
        currentHash === emptyHash
      ) {
        toast.error(
          "⚠️ Data loss detected! Use the recovery banner to restore from backup.",
          { duration: 10000 }
        );
      }

      lastDataHash = currentHash;
      localStorage.setItem(DATA_HASH_KEY, currentHash);
    } catch (err) {
      console.error("[dataProtection] Monitoring error:", err);
    }
  }, 5000);

  return () => clearInterval(interval);
}

/* ------------------------------------------------------------------ */
/* Auto backup scheduler                                              */
/* ------------------------------------------------------------------ */

export function setupAutoBackup(intervalSeconds: number): () => void {
  const intervalMs = Math.max(intervalSeconds, 5) * 1000;

  const interval = setInterval(async () => {
    try {
      await createBackup();
    } catch (err) {
      console.error("[dataProtection] Auto-backup failed:", err);
    }
  }, intervalMs);

  return () => clearInterval(interval);
}

/* ------------------------------------------------------------------ */
/* Data integrity check                                               */
/* ------------------------------------------------------------------ */

export async function checkDataIntegrity(): Promise<DataIntegrityResult> {
  const issues: string[] = [];

  try {
    const admins = await kvArray("admins");
    const auctions = await kvArray("auctions");
    const invites = await kvArray("invites");
    const bids = await kvArray("bids");

    if (admins.length === 0 && auctions.length > 0) {
      issues.push("Auctions exist but no admin accounts were found.");
    }

    if (auctions.length === 0 && bids.length > 0) {
      issues.push("Bids exist without any auctions.");
    }

    if (invites.length > 0 && auctions.length === 0) {
      issues.push("Invites exist but no auctions were found.");
    }
  } catch (err) {
    console.error("[dataProtection] Integrity check failed:", err);
    issues.push("Unable to verify local data integrity.");
  }

  return issues.length > 0 ? { issues } : {};
}

/* ------------------------------------------------------------------ */
/* Backup creation                                                    */
/* ------------------------------------------------------------------ */

export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    timestamp: Date.now(),
    admins: await kvArray("admins"),
    auctions: await kvArray("auctions"),
    invites: await kvArray("invites"),
    bids: await kvArray("bids"),
  };

  localStorage.setItem(`${BACKUP_PREFIX}${backup.timestamp}`, JSON.stringify(backup));

  cleanOldBackups();
  return backup;
}

/* ------------------------------------------------------------------ */
/* Backup retrieval                                                   */
/* ------------------------------------------------------------------ */

export function getAllBackups(): BackupData[] {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(BACKUP_PREFIX))
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key)!) as BackupData;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.timestamp - a!.timestamp) as BackupData[];
}

export function getLatestBackup(): BackupData | null {
  const backups = getAllBackups();
  return backups.length > 0 ? backups[0] : null;
}

/* ------------------------------------------------------------------ */
/* Backup restore                                                     */
/* ------------------------------------------------------------------ */

export async function restoreFromBackup(backup: BackupData): Promise<void> {
  await (kv as any).set("admins", backup.admins ?? []);
  await (kv as any).set("auctions", backup.auctions ?? []);
  await (kv as any).set("invites", backup.invites ?? []);
  await (kv as any).set("bids", backup.bids ?? []);
}

/* ------------------------------------------------------------------ */
/* File import                                                        */
/* ------------------------------------------------------------------ */

export async function importDataFromFile(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (
    typeof data !== "object" ||
    data === null ||
    !("admins" in data) ||
    !("auctions" in data)
  ) {
    throw new Error("Invalid backup file format");
  }

  await (kv as any).set("admins", (data as any).admins ?? []);
  await (kv as any).set("auctions", (data as any).auctions ?? []);
  await (kv as any).set("invites", (data as any).invites ?? []);
  await (kv as any).set("bids", (data as any).bids ?? []);
}

/* ------------------------------------------------------------------ */
/* Cleanup                                                            */
/* ------------------------------------------------------------------ */

function cleanOldBackups(): void {
  const backups = getAllBackups();
  const excess = backups.slice(10); // keep latest 10

  for (const backup of excess) {
    const key = `${BACKUP_PREFIX}${backup.timestamp}`;
    localStorage.removeItem(key);
  }
}
