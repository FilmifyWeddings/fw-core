/**
 * Ultra-Fast File-Based Session Storage for Baileys Multi-Tenancy
 * Uses Baileys built-in useMultiFileAuthState stored locally on disk at /var/www/fw-core/sessions/${workspaceId}/
 * Eliminates Supabase Statement Timeouts (57014), Bad MAC key corruption, and session collisions.
 */
import * as fs from 'fs';
import * as path from 'path';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
});
/**
 * Returns the local file system path for a given workspace's session files.
 * Ensures the target directory exists before use.
 */
export function getSessionDir(workspaceId) {
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
 * Completely purges all local session files for a workspace from disk.
 */
export function purgeSessionDir(workspaceId) {
    try {
        const dir = getSessionDir(workspaceId);
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            logger.info({ workspaceId, dir }, '🗑️ Local session directory purged cleanly from disk');
        }
    }
    catch (err) {
        logger.error({ err, workspaceId }, 'Failed to purge local session directory from disk');
    }
}
/**
 * Initializes or loads file-based auth state for a workspace.
 */
export async function useWorkspaceAuthState(workspaceId) {
    const dir = getSessionDir(workspaceId);
    logger.info({ workspaceId, dir }, '📁 Initializing file-based auth state for workspace...');
    return await useMultiFileAuthState(dir);
}
// Re-export alias for backwards compatibility
export async function useSupabaseAuthStateNamespaced(_supabase, workspaceId) {
    return useWorkspaceAuthState(workspaceId);
}
