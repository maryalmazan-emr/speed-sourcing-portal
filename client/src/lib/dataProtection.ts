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

/* ------------------------------------------------------------------ */
/* Data monitoring (loss detection)                                   */
/* ------------------------------------------------------------------ */

export function setupDataMonitoring(): () => void {
  let lastDataHash = localStorage.getItem(DATA_HASH_KEY) || "";

  const interval = setInterval(async () => {
    try {
      const admins = (await kv.get("admins")) ?? [];
      const auctions = (await kv.get("auctions")) ?? [];
      const invites = (await kv.get("invites")) ?? [];
      const bids = (await kv.get("bids")) ?? [];

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
/* Backup creation                                                    */
/* ------------------------------------------------------------------ */

export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    timestamp: Date.now(),
    admins: (await kv.get("admins")) ?? [],
    auctions: (await kv.get("auctions")) ?? [],
    invites: (await kv.get("invites")) ?? [],
    bids: (await kv.get("bids")) ?? [],
  };

  localStorage.setItem(
    `${BACKUP_PREFIX}${backup.timestamp}`,
    JSON.stringify(backup)
  );

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
  await kv.set("admins", backup.admins ?? []);
  await kv.set("auctions", backup.auctions ?? []);
  await kv.set("invites", backup.invites ?? []);
  await kv.set("bids", backup.bids ?? []);
}

/* ------------------------------------------------------------------ */
/* File import (FIXES YOUR ERROR)                                     */
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

  await kv.set("admins", (data as any).admins ?? []);
  await kv.set("auctions", (data as any).auctions ?? []);
  await kv.set("invites", (data as any).invites ?? []);
  await kv.set("bids", (data as any).bids ?? []);
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