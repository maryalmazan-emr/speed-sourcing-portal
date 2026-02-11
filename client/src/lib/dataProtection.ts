/**
 * Data Persistence and Backup Utilities
 * Ensures data is never lost and can be recovered
 */

import { kv } from './supabase';
import { toast } from 'sonner';

const BACKUP_PREFIX = 'speedsourcing_backup:';
const LAST_BACKUP_KEY = 'speedsourcing:last_backup_timestamp';
const DATA_HASH_KEY = 'speedsourcing:data_hash';

export interface BackupData {
  timestamp: string;
  admins: any[];
  auctions: any[];
  invites: any[];
  bids: any[];
}

/**
 * Generate a simple hash of the data to detect changes
 */
function generateDataHash(data: any): string {
  return btoa(JSON.stringify(data)).substring(0, 32);
}

/**
 * Monitor for unexpected data loss
 */
export function setupDataMonitoring(): () => void {
  console.log('[DataProtection] Setting up data loss monitoring...');
  
  let lastDataHash = localStorage.getItem(DATA_HASH_KEY) || '';
  
  const checkInterval = setInterval(async () => {
    try {
      const admins = await kv.get('admins') || [];
      const auctions = await kv.get('auctions') || [];
      const invites = await kv.get('invites') || [];
      const bids = await kv.get('bids') || [];
      
      const currentData = { admins, auctions, invites, bids };
      const currentHash = generateDataHash(currentData);
      
      // Check if data has changed
      if (lastDataHash && lastDataHash !== currentHash) {
        const wasEmpty = lastDataHash === generateDataHash({ admins: [], auctions: [], invites: [], bids: [] });
        const isEmpty = currentHash === generateDataHash({ admins: [], auctions: [], invites: [], bids: [] });
        
        // Detect if data was deleted
        if (!wasEmpty && isEmpty) {
          console.error('[DataProtection] ⚠️ DATA LOSS DETECTED! All data has been cleared!');
          toast.error('Data loss detected! Check Debug Storage panel to restore from backup.', {
            duration: 10000,
          });
        }
      }
      
      lastDataHash = currentHash;
      localStorage.setItem(DATA_HASH_KEY, currentHash);
    } catch (error) {
      console.error('[DataProtection] Error in data monitoring:', error);
    }
  }, 5000); // Check every 5 seconds
  
  return () => {
    clearInterval(checkInterval);
    console.log('[DataProtection] Data monitoring stopped');
  };
}

/**
 * Create an automatic backup of all data
 */
export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    admins: await kv.get('admins') || [],
    auctions: await kv.get('auctions') || [],
    invites: await kv.get('invites') || [],
    bids: await kv.get('bids') || [],
  };

  // Store backup in localStorage with timestamp
  const backupKey = `${BACKUP_PREFIX}${Date.now()}`;
  localStorage.setItem(backupKey, JSON.stringify(backup));
  localStorage.setItem(LAST_BACKUP_KEY, backup.timestamp);

  console.log('[Backup] ✅ Created backup at', backup.timestamp);
  console.log('[Backup] Data counts:', {
    admins: backup.admins.length,
    auctions: backup.auctions.length,
    invites: backup.invites.length,
    bids: backup.bids.length,
  });

  // Clean up old backups (keep only last 10)
  await cleanOldBackups();

  return backup;
}

/**
 * Get all available backups
 */
export function getAllBackups(): BackupData[] {
  const backups: BackupData[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) {
      try {
        const backup = JSON.parse(localStorage.getItem(key) || '');
        backups.push(backup);
      } catch (error) {
        console.error('[Backup] Error parsing backup:', key, error);
      }
    }
  }

  // Sort by timestamp (newest first)
  return backups.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get the most recent backup
 */
export function getLatestBackup(): BackupData | null {
  const backups = getAllBackups();
  return backups.length > 0 ? backups[0] : null;
}

/**
 * Restore data from a backup
 */
export async function restoreFromBackup(backup: BackupData): Promise<void> {
  console.log('[Backup] Restoring from backup:', backup.timestamp);
  
  await kv.set('admins', backup.admins);
  await kv.set('auctions', backup.auctions);
  await kv.set('invites', backup.invites);
  await kv.set('bids', backup.bids);
  
  console.log('[Backup] ✅ Restore complete');
}

/**
 * Clean up old backups, keeping only the most recent 10
 */
async function cleanOldBackups(): Promise<void> {
  const backups = getAllBackups();
  
  // Keep only the 10 most recent backups
  const backupsToDelete = backups.slice(10);
  
  for (const backup of backupsToDelete) {
    // Find and remove the backup
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_PREFIX)) {
        try {
          const stored = JSON.parse(localStorage.getItem(key) || '');
          if (stored.timestamp === backup.timestamp) {
            localStorage.removeItem(key);
            console.log('[Backup] Cleaned up old backup:', backup.timestamp);
            break;
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    }
  }
}

/**
 * Export data as downloadable JSON file
 */
export function exportDataToFile(): void {
  const data: any = {
    exported_at: new Date().toISOString(),
    admins: localStorage.getItem('speedsourcing:admins'),
    auctions: localStorage.getItem('speedsourcing:auctions'),
    invites: localStorage.getItem('speedsourcing:invites'),
    bids: localStorage.getItem('speedsourcing:bids'),
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `speedsourcing-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  
  console.log('[Export] ✅ Data exported to file');
}

/**
 * Import data from file
 */
export async function importDataFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate the data structure
        if (!data.admins || !data.auctions || !data.invites || !data.bids) {
          throw new Error('Invalid backup file format');
        }
        
        // Restore each key
        if (data.admins) localStorage.setItem('speedsourcing:admins', data.admins);
        if (data.auctions) localStorage.setItem('speedsourcing:auctions', data.auctions);
        if (data.invites) localStorage.setItem('speedsourcing:invites', data.invites);
        if (data.bids) localStorage.setItem('speedsourcing:bids', data.bids);
        
        console.log('[Import] ✅ Data imported from file');
        resolve();
      } catch (error) {
        console.error('[Import] Error importing data:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Check data integrity and log warnings
 * @param silent - If true, don't log to console (for internal checks)
 */
export async function checkDataIntegrity(silent: boolean = false): Promise<{
  healthy: boolean;
  issues: string[];
  counts: {
    admins: number;
    auctions: number;
    invites: number;
    bids: number;
  };
}> {
  const issues: string[] = [];
  
  const admins = await kv.get('admins') || [];
  const auctions = await kv.get('auctions') || [];
  const invites = await kv.get('invites') || [];
  const bids = await kv.get('bids') || [];
  
  const counts = {
    admins: Array.isArray(admins) ? admins.length : 0,
    auctions: Array.isArray(auctions) ? auctions.length : 0,
    invites: Array.isArray(invites) ? invites.length : 0,
    bids: Array.isArray(bids) ? bids.length : 0,
  };
  
  // Check for potential issues (only report real problems)
  // Note: Missing admins is not an issue since preset accounts are auto-created
  
  if (counts.auctions > 0 && counts.invites === 0) {
    issues.push('⚠️ Auctions exist but no vendor invites found');
  }
  
  if (counts.bids > 0 && counts.auctions === 0) {
    issues.push('⚠️ Bids exist but no auctions found - data may be corrupted');
  }
  
  if (counts.invites > 0 && counts.auctions === 0) {
    issues.push('⚠️ Invites exist but no auctions found - data may be corrupted');
  }
  
  if (!silent) {
    console.log('[Data Integrity Check]', {
      healthy: issues.length === 0,
      counts,
      issues: issues.length > 0 ? issues : ['No issues detected'],
    });
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    counts,
  };
}

/**
 * Set up automatic backups at regular intervals
 */
export function setupAutoBackup(intervalMinutes: number = 15): () => void {
  console.log(`[AutoBackup] Setting up automatic backups every ${intervalMinutes} minutes`);
  
  // Set up interval (don't create initial backup here - let the caller decide)
  const intervalId = setInterval(() => {
    createBackup();
  }, intervalMinutes * 60 * 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('[AutoBackup] Automatic backups stopped');
  };
}
