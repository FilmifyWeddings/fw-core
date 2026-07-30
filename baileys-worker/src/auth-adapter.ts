/**
 * Ultra-Fast File-Based Session Storage for Baileys Multi-Tenancy
 * Uses Baileys built-in useMultiFileAuthState stored locally on disk at /var/www/fw-core/sessions/${workspaceId}/
 * Eliminates Supabase Statement Timeouts (57014), Bad MAC key corruption, and session collisions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { useMultiFileAuthState, AuthenticationCreds, SignalKeyStore } from '@whiskeysockets/baileys';
export type { SignalKeyStore };
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty' },
});

/**
 * Returns the local file system path for a given workspace's session files.
 * Ensures the target directory exists before use.
 */
export function getSessionDir(workspaceId: string): string {
  const basePath = fs.existsSync('/var/www/fw-core')
    ? '/var/www/fw-core/sessions'
    : path.resolve(process.cwd(), 'sessions');

  const dir = path.join(basePath, workspaceId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Checks if disk session credentials exist for a workspace.
 */
export function hasDiskSession(workspaceId: string): boolean {
  const basePath = fs.existsSync('/var/www/fw-core')
    ? '/var/www/fw-core/sessions'
    : path.resolve(process.cwd(), 'sessions');

  const credsFile = path.join(basePath, workspaceId, 'creds.json');
  return fs.existsSync(credsFile);
}

/**
 * Completely purges all local session files for a workspace from disk.
 */
export function purgeSessionDir(workspaceId: string): void {
  try {
    const dir = getSessionDir(workspaceId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.info({ workspaceId, dir }, '🗑️ Local session directory purged cleanly from disk');
    }
  } catch (err) {
    logger.error({ err, workspaceId }, 'Failed to purge local session directory from disk');
  }
}

/**
 * Initializes or loads file-based auth state for a workspace.
 * Wraps saveCreds to atomically guarantee target directory existence before disk write.
 */
export async function useWorkspaceAuthState(
  workspaceId: string
): Promise<{ state: { creds: AuthenticationCreds; keys: SignalKeyStore }; saveCreds: () => Promise<void> }> {
  const dir = getSessionDir(workspaceId);
  logger.info({ workspaceId, dir }, '📁 Initializing file-based auth state for workspace...');
  const authState = await useMultiFileAuthState(dir);

  const originalSaveCreds = authState.saveCreds;
  const safeSaveCreds = async () => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await originalSaveCreds();
    } catch (err) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await originalSaveCreds();
    }
  };

  return {
    state: authState.state,
    saveCreds: safeSaveCreds,
  };
}

// Re-export alias for backwards compatibility
export async function useSupabaseAuthStateNamespaced(
  _supabase: any,
  workspaceId: string
): Promise<{ state: { creds: AuthenticationCreds; keys: SignalKeyStore }; saveCreds: () => Promise<void> }> {
  return useWorkspaceAuthState(workspaceId);
}
