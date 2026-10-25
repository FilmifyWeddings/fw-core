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

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
function norm(a) {
  let mag = Math.sqrt(dot(a, a));
  return a.map(x => x / (mag || 1));
}

async function fix() {
  const galleryId = '9629e7c0-1476-4069-b75b-4d4f197015e9';
  const { data: guests } = await s.from('event_guest_registrations').select('*').eq('gallery_id', galleryId);
  const sushi = guests?.find(g => g.guest_name?.toLowerCase().includes('sushi'));
  if (!sushi) return console.log('Sushi not found');

  const queryEmb = norm(sushi.face_embedding);
  const { data: faces } = await s.from('photo_faces').select('id, photo_id, embedding').eq('gallery_id', galleryId);
  const matchedSet = new Set();
  faces.forEach(f => {
    const emb = norm(typeof f.embedding === 'string' ? JSON.parse(f.embedding) : f.embedding);
    if (dot(queryEmb, emb) >= 0.40) {
      matchedSet.add(f.photo_id);
    }
  });
  const matchedList = Array.from(matchedSet);
  console.log('Matched list count >= 0.40:', matchedList.length);
  await s.from('event_guest_registrations').update({ matched_photo_ids: matchedList }).eq('id', sushi.id);
  console.log('Successfully updated Sushi m matched_photo_ids to', matchedList.length);
}
fix().catch(console.error);
