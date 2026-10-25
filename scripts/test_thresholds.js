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

async function run() {
  const galleryId = '9629e7c0-1476-4069-b75b-4d4f197015e9';
  
  // 1. Get Sushi m embedding
  const { data: guests } = await s.from('event_guest_registrations').select('*').eq('gallery_id', galleryId);
  const sushi = guests.find(g => g.guest_name?.toLowerCase().includes('sushi'));
  if (!sushi) {
    console.log('Sushi not found');
    return;
  }
  const queryEmb = norm(sushi.face_embedding);
  console.log('Found guest Sushi m, embedding length:', queryEmb.length);

  // 2. Fetch all photo_faces for gallery
  const { data: faces } = await s.from('photo_faces').select('id, photo_id, embedding').eq('gallery_id', galleryId);
  console.log('Total faces in gallery:', faces.length);

  // Calculate similarity for each photo
  const photoSimMap = {}; // photo_id -> max sim
  faces.forEach(f => {
    const emb = norm(typeof f.embedding === 'string' ? JSON.parse(f.embedding) : f.embedding);
    const sim = dot(queryEmb, emb);
    if (!photoSimMap[f.photo_id] || sim > photoSimMap[f.photo_id]) {
      photoSimMap[f.photo_id] = sim;
    }
  });

  const photoSimList = Object.entries(photoSimMap).map(([photo_id, sim]) => ({ photo_id, sim }));
  photoSimList.sort((a, b) => b.sim - a.sim);

  console.log('\n--- THRESHOLD COMPARISON ---');
  [0.35, 0.38, 0.40, 0.42, 0.45, 0.48, 0.50].forEach(t => {
    const count = photoSimList.filter(x => x.sim >= t).length;
    console.log(`Threshold >= ${t}: ${count} unique photos`);
  });

  console.log('\nTop 20 photo similarities:');
  photoSimList.slice(0, 20).forEach((x, i) => {
    console.log(`  #${i+1}: sim=${x.sim.toFixed(4)} photo_id=${x.photo_id}`);
  });

  console.log('\nAround threshold 0.40 - 0.48:');
  const between = photoSimList.filter(x => x.sim >= 0.40 && x.sim < 0.48);
  console.log(`Photos between 0.40 and 0.48: count = ${between.length}`);
  between.forEach((x, i) => {
    console.log(`  sim=${x.sim.toFixed(4)} photo_id=${x.photo_id}`);
  });
}
run().catch(console.error);
