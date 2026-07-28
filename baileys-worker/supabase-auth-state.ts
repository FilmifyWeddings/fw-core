import { SupabaseClient } from '@supabase/supabase-js';
import { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty' },
});

type SignalDataSet = {
  [key: string]: { [id: string]: any };
};

export type SignalKeyStore = {
  get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }>;
  set(data: SignalDataSet): Promise<void>;
};

export async function useSupabaseAuthState(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ state: { creds: AuthenticationCreds; keys: SignalKeyStore }; saveCreds: () => Promise<void> }> {
  let creds!: AuthenticationCreds;
  let keysCache: Record<string, any> = {};

  async function loadAuthState(): Promise<boolean> {
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
      const parsedCreds = JSON.parse(data.creds_json);
      const parsedKeys = JSON.parse(data.keys_json);

      if (!parsedCreds || !parsedKeys) {
        logger.warn('Parsed auth state is empty — treating as missing');
        return false;
      }

      creds = parsedCreds;
      keysCache = parsedKeys;
      logger.info('Auth state restored from Supabase successfully');
      return true;
    } catch (parseErr) {
      logger.error({ err: parseErr }, 'Failed to parse auth state JSON from Supabase');
      return false;
    }
  }

  async function persistAuthState(): Promise<void> {
    try {
      const credsJson = JSON.stringify(creds);
      const keysJson = JSON.stringify(keysCache);

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
      } else {
        logger.debug('Auth state saved to Supabase');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to persist auth state');
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
        if (typeCache[id] !== undefined) {
          result[id] = typeCache[id];
        }
      }
      return result as any;
    },
    async set(data: SignalDataSet): Promise<void> {
      for (const [type, entries] of Object.entries(data)) {
        if (!keysCache[type]) keysCache[type] = {};
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
