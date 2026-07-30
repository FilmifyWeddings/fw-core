import { SupabaseClient } from '@supabase/supabase-js';
import { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { useSupabaseAuthStateNamespaced, SignalKeyStore } from './src/auth-adapter.js';

export type { SignalKeyStore };

export async function useSupabaseAuthState(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ state: { creds: AuthenticationCreds; keys: SignalKeyStore }; saveCreds: () => Promise<void> }> {
  return useSupabaseAuthStateNamespaced(supabase, workspaceId);
}
