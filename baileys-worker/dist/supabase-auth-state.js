import { useSupabaseAuthStateNamespaced } from './src/auth-adapter.js';
export async function useSupabaseAuthState(supabase, workspaceId) {
    return useSupabaseAuthStateNamespaced(supabase, workspaceId);
}
