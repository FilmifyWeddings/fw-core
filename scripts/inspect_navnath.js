const fs = require('fs');
const { createClient } = require('/var/www/fw-core/node_modules/@supabase/supabase-js');

const envContent = fs.readFileSync('/var/www/fw-core/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const targetId = '9629e7c0-1476-4069-b75b-4d4f197015e9';
  
  // Find gallery
  const { data: gList } = await s.from('event_galleries').select('id, title, slug').ilike('title', '%navnath%');
  console.log('Galleries matching navnath:', gList);

  const { data: gExact } = await s.from('event_galleries').select('id, title, slug').eq('id', targetId);
  console.log('Gallery exact id:', gExact);

  // If not in event_galleries, check other gallery tables
  if (!gExact || gExact.length === 0) {
    const { data: allG } = await s.from('event_galleries').select('id, title, slug').limit(5);
    console.log('Sample event_galleries:', allG);
  }

  // Look at photo_faces with gallery_id = targetId
  const { data: sampleFaces } = await s.from('photo_faces').select('id, photo_id, gallery_id').eq('gallery_id', targetId).limit(5);
  console.log('Sample photo_faces with targetId:', sampleFaces);

  // Check gallery_photos where gallery_id = targetId
  const { count: pCount, data: samplePhotos } = await s.from('gallery_photos').select('id, gallery_id, event_id', { count: 'exact' }).limit(5);
  console.log('Sample gallery_photos columns:', samplePhotos);

  // Check guest registration details
  const { data: guests } = await s.from('event_guest_registrations').select('*').eq('gallery_id', targetId);
  console.log('Guests for targetId:', guests);

}
run().catch(console.error);
