import { supabaseAdmin } from './src/lib/supabase.js';

async function main() {
  const workspaceId = '37c63a54-d4f1-4b99-b546-3d965cd23a37';
  console.log(`Querying profile for workspace: ${workspaceId}...`);
  
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('Profile Row:', JSON.stringify(profile, null, 2));
}

main().catch(console.error);
