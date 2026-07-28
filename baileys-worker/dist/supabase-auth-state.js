import { BufferJSON } from '@whiskeysockets/baileys';
import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
});
// Custom reviver that handles BOTH Buffer serialization formats:
// 1. { type: 'Buffer', data: '<base64>' }  — from BufferJSON.replacer / Baileys internals
// 2. { type: 'Buffer', data: [num, ...] }   — from default JSON.stringify(Buffer)
function bufferReviver(_, value) {
    if (typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        value.type === 'Buffer' &&
        value.data !== undefined) {
        const data = value.data;
        if (typeof data === 'string') {
            // Base64 format from BufferJSON.replacer
            return Buffer.from(data, 'base64');
        }
        if (Array.isArray(data)) {
            // Decimal array format from default JSON.stringify(Buffer)
            return Buffer.from(data);
        }
    }
    return BufferJSON.reviver(_, value);
}
export async function useSupabaseAuthState(supabase, workspaceId) {
    let creds;
    let keysCache = {};
    async function loadAuthState() {
        const { data, error } = await supabase
            .from('baileys_sessions')
            .select('creds_json, keys_json')
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (error) {
            logger.error({ err: error }, 'Failed to load auth state from Supabase');
            return false;
        }
        if (!data?.creds_json || !data?.keys_json) {
            logger.info('No existing auth state found in Supabase — will generate QR');
            return false;
        }
        try {
            const parsedCreds = JSON.parse(data.creds_json, bufferReviver);
            const parsedKeys = JSON.parse(data.keys_json, bufferReviver);
            if (!parsedCreds || !parsedKeys) {
                logger.warn('Parsed auth state is empty — treating as missing');
                return false;
            }
            creds = parsedCreds;
            keysCache = parsedKeys;
            logger.info('Auth state restored from Supabase successfully');
            return true;
        }
        catch (parseErr) {
            logger.error({ err: parseErr }, 'Failed to parse auth state JSON from Supabase');
            return false;
        }
    }
    async function persistAuthState() {
        try {
            const credsJson = JSON.stringify(creds, BufferJSON.replacer);
            const keysJson = JSON.stringify(keysCache, BufferJSON.replacer);
            const { error } = await supabase
                .from('baileys_sessions')
                .upsert({
                workspace_id: workspaceId,
                creds_json: credsJson,
                keys_json: keysJson,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
            if (error) {
                logger.error({ err: error }, 'Failed to persist auth state to Supabase');
            }
            else {
                logger.debug('Auth state saved to Supabase');
            }
        }
        catch (err) {
            logger.error({ err }, 'Failed to persist auth state');
        }
    }
    const hasExisting = await loadAuthState();
    if (!hasExisting) {
        const { initAuthCreds } = await import('@whiskeysockets/baileys');
        creds = initAuthCreds();
        keysCache = {};
    }
    const keys = {
        async get(type, ids) {
            const result = {};
            const typeCache = keysCache[type] || {};
            for (const id of ids) {
                if (typeCache[id] !== undefined) {
                    result[id] = typeCache[id];
                }
            }
            return result;
        },
        async set(data) {
            for (const [type, entries] of Object.entries(data)) {
                if (!keysCache[type])
                    keysCache[type] = {};
                if (entries) {
                    for (const [id, value] of Object.entries(entries)) {
                        keysCache[type][id] = value;
                    }
                }
            }
        },
    };
    return {
        state: { creds, keys },
        saveCreds: persistAuthState,
    };
}
