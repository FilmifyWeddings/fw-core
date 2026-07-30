/**
 * Supabase Database Auth Adapter for Baileys
 * Strictly scopes all credentials, pre-keys, and signal state per Workspace ID / User ID.
 * Format for session keys: `${workspaceId}_creds`, `${workspaceId}_app-state-sync-key-*`, `${workspaceId}_session-*`
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AuthenticationCreds, SignalDataTypeMap, BufferJSON } from '@whiskeysockets/baileys';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty' },
});

function bufferReviver(_: string, value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as any).type === 'Buffer' &&
    (value as any).data !== undefined
  ) {
    const data = (value as any).data;
    if (typeof data === 'string') {
      return Buffer.from(data, 'base64');
    }
    if (Array.isArray(data)) {
      return Buffer.from(data as number[]);
    }
  }
  return BufferJSON.reviver(_, value);
}

type SignalDataSet = {
  [key: string]: { [id: string]: any };
};

export type SignalKeyStore = {
  get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }>;
  set(data: SignalDataSet): Promise<void>;
};

export async function useSupabaseAuthStateNamespaced(
  supabase: SupabaseClient,
  targetWorkspaceId: string,
  userId?: string
): Promise<{ state: { creds: AuthenticationCreds; keys: SignalKeyStore }; saveCreds: () => Promise<void> }> {
  let creds!: AuthenticationCreds;
  let keysCache: Record<string, any> = {};

  const effectiveId = userId ?? targetWorkspaceId;

  async function loadAuthState(): Promise<boolean> {
    const { data, error } = await supabase
      .from('baileys_sessions')
      .select('creds_json, keys_json')
      .eq('workspace_id', targetWorkspaceId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, workspaceId: targetWorkspaceId }, 'Failed to load auth state from Supabase');
      return false;
    }

    if (!data?.creds_json || !data?.keys_json) {
      logger.info({ workspaceId: targetWorkspaceId }, 'No existing auth state found in Supabase — will generate QR');
      return false;
    }

    try {
      const parsedCreds = JSON.parse(data.creds_json, bufferReviver);
      const parsedKeys = JSON.parse(data.keys_json, bufferReviver);

      if (!parsedCreds || !parsedKeys) {
        logger.warn({ workspaceId: targetWorkspaceId }, 'Parsed auth state is empty — treating as missing');
        return false;
      }

      creds = parsedCreds;
      keysCache = parsedKeys;
      logger.info({ workspaceId: targetWorkspaceId, effectiveId }, 'Auth state restored from Supabase successfully');
      return true;
    } catch (parseErr) {
      logger.error({ err: parseErr, workspaceId: targetWorkspaceId }, 'Failed to parse auth state JSON from Supabase');
      return false;
    }
  }

  let saveTimer: NodeJS.Timeout | null = null;

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistAuthState().catch(err => logger.error({ err, workspaceId: targetWorkspaceId }, 'Failed to auto-persist auth state'));
    }, 200);
  }

  async function persistAuthState(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      const credsJson = JSON.stringify(creds, BufferJSON.replacer);
      const keysJson = JSON.stringify(keysCache, BufferJSON.replacer);

      const { error } = await supabase
        .from('baileys_sessions')
        .upsert({
          workspace_id: targetWorkspaceId,
          creds_json: credsJson,
          keys_json: keysJson,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });

      if (error) {
        logger.error({ err: error, workspaceId: targetWorkspaceId }, 'Failed to persist auth state to Supabase');
      } else {
        logger.debug({ workspaceId: targetWorkspaceId }, 'Auth state saved to Supabase');
      }
    } catch (err) {
      logger.error({ err, workspaceId: targetWorkspaceId }, 'Failed to persist auth state');
    }
  }

  const hasExisting = await loadAuthState();

  if (!hasExisting) {
    const { initAuthCreds } = await import('@whiskeysockets/baileys');
    creds = initAuthCreds();
    keysCache = {};
  }

  const keys: SignalKeyStore = {
    async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }> {
      const result: Record<string, any> = {};
      const typeCache = keysCache[type] || {};
      for (const id of ids) {
        const namespacedKey = `${type}-${id}`;
        if (typeCache[id] !== undefined) {
          result[id] = typeCache[id];
        } else if (typeCache[namespacedKey] !== undefined) {
          result[id] = typeCache[namespacedKey];
        }
      }
      return result as any;
    },
    async set(data: SignalDataSet): Promise<void> {
      let changed = false;
      for (const [type, entries] of Object.entries(data)) {
        if (!keysCache[type]) keysCache[type] = {};
        if (entries) {
          for (const [id, value] of Object.entries(entries)) {
            const namespacedKey = `${effectiveId}_${type}_${id}`;
            if (value === null || value === undefined) {
              delete keysCache[type][id];
              delete keysCache[type][namespacedKey];
            } else {
              keysCache[type][id] = value;
            }
            changed = true;
          }
        }
      }
      if (changed) {
        scheduleSave();
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds: persistAuthState,
  };
}
