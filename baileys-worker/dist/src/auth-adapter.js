/**
 * Ultra-Fast File-Based Session Storage for Baileys Multi-Tenancy
 * Uses Baileys built-in useMultiFileAuthState stored locally on disk at /var/www/fw-core/sessions/${workspaceId}/
 * Eliminates Supabase Statement Timeouts (57014), Bad MAC key corruption, and session collisions.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
});
export function getSessionsBasePath() {
    if (fs.existsSync('/var/www/fw-core/sessions')) {
        return '/var/www/fw-core/sessions';
    }
    if (fs.existsSync('/var/www/fw-core')) {
        const dir = '/var/www/fw-core/sessions';
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    const candidates = [
        path.resolve(process.cwd(), 'baileys-worker', 'sessions'),
        path.resolve(process.cwd(), 'sessions'),
        path.resolve(__dirname, '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'baileys-worker', 'sessions'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c))
            return c;
    }
    return path.resolve(process.cwd(), 'sessions');
}
/**
 * Returns the local file system path for a given workspace's session files.
 * Ensures the target directory exists before use.
 */
export function getSessionDir(workspaceId) {
    if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
        throw new Error('Cannot getSessionDir for empty workspaceId');
    }
    const candidates = [
        '/var/www/fw-core/sessions',
        path.resolve(process.cwd(), 'baileys-worker', 'sessions'),
        path.resolve(process.cwd(), 'sessions'),
        path.resolve(__dirname, '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'baileys-worker', 'sessions'),
    ];
    for (const base of candidates) {
        const credsFile = path.join(base, workspaceId, 'creds.json');
        if (fs.existsSync(credsFile)) {
            return path.join(base, workspaceId);
        }
    }
    const basePath = getSessionsBasePath();
    const dir = path.join(basePath, workspaceId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
/**
 * Checks if disk session credentials exist for a workspace.
 */
export function hasDiskSession(workspaceId) {
    if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
        return false;
    }
    const candidates = [
        '/var/www/fw-core/sessions',
        path.resolve(process.cwd(), 'baileys-worker', 'sessions'),
        path.resolve(process.cwd(), 'sessions'),
        path.resolve(__dirname, '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'sessions'),
        path.resolve(__dirname, '..', '..', 'baileys-worker', 'sessions'),
    ];
    for (const base of candidates) {
        const credsFile = path.join(base, workspaceId, 'creds.json');
        if (fs.existsSync(credsFile))
            return true;
    }
    return false;
}
/**
 * Completely purges all local session files for a workspace from disk.
 */
export function purgeSessionDir(workspaceId) {
    if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
        return;
    }
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
 * Wraps saveCreds to atomically guarantee target directory existence before disk write.
 */
export async function useWorkspaceAuthState(workspaceId) {
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
        }
        catch (err) {
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
export async function useSupabaseAuthStateNamespaced(_supabase, workspaceId) {
    return useWorkspaceAuthState(workspaceId);
}
