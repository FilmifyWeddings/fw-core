const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qrscdxkdjgsmxxwmnndu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Key missing in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllFilesRecursive(bucket, folderPath = '') {
  const fileList = [];

  const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error || !data) {
    return fileList;
  }

  for (const item of data) {
    const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    // If item has no id/metadata size, it is a directory
    if (!item.id && (!item.metadata || !item.metadata.size)) {
      const subFiles = await listAllFilesRecursive(bucket, itemPath);
      fileList.push(...subFiles);
    } else {
      fileList.push(itemPath);
    }
  }

  return fileList;
}

async function compressAndReplaceStorageMedia() {
  console.log('=========================================================');
  console.log('⚡ IN-PLACE SUPABASE STORAGE IMAGE COMPRESSOR STARTING');
  console.log('=========================================================');
  console.log(`📌 Supabase URL: ${supabaseUrl}`);

  // Fetch all buckets dynamically
  const { data: bucketsData, error: bucketsErr } = await supabase.storage.listBuckets();
  
  let targetBucketNames = [];

  if (bucketsErr || !bucketsData || bucketsData.length === 0) {
    console.warn('⚠️ Could not fetch buckets dynamically, using default bucket list.');
    targetBucketNames = ['quotation-assets', 'media-assets', 'client-files', 'avatars', 'whatsapp-media', 'baileys-media', 'team-avatars'];
  } else {
    targetBucketNames = bucketsData.map(b => b.name);
    console.log(`📦 Discovered ${targetBucketNames.length} Storage Buckets: ${targetBucketNames.join(', ')}\n`);
  }

  let totalOriginalBytes = 0;
  let totalNewBytes = 0;
  let processedCount = 0;
  let skippedCount = 0;

  for (const bucket of targetBucketNames) {
    console.log(`🔍 Scanning bucket: "${bucket}"...`);
    const files = await listAllFilesRecursive(bucket);

    if (files.length === 0) {
      console.log(`   ℹ️ Bucket "${bucket}" is empty.`);
      continue;
    }

    console.log(`   Found ${files.length} items in "${bucket}". Processing images...`);

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();

      // Filter for image formats
      if (!['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext)) {
        skippedCount++;
        continue;
      }

      try {
        // Download image file from Supabase Storage
        const { data: blob, error: downloadErr } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (downloadErr || !blob) {
          console.warn(`   ⚠️ Download error for ${bucket}/${filePath}:`, downloadErr?.message);
          continue;
        }

        const buffer = Buffer.from(await blob.arrayBuffer());
        const originalSize = buffer.length;

        // Skip files that are already small WebP (< 50KB)
        if (originalSize < 50 * 1024 && ext === '.webp') {
          skippedCount++;
          continue;
        }

        // In-memory HD WebP compression with Sharp (max 2048px, quality 88%)
        const compressedBuffer = await sharp(buffer)
          .resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 88, effort: 4 })
          .toBuffer();

        const newSize = compressedBuffer.length;
        const savingsBytes = originalSize - newSize;

        // Overwrite file in-place with 1-Year Cache Header
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, compressedBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000', // 1 YEAR BROWSER CACHE ENFORCED
            upsert: true,
          });

        if (uploadErr) {
          console.error(`   ❌ Failed to overwrite ${bucket}/${filePath}:`, uploadErr.message);
          continue;
        }

        processedCount++;
        totalOriginalBytes += originalSize;
        totalNewBytes += newSize;

        const origKB = (originalSize / 1024).toFixed(1);
        const newKB = (newSize / 1024).toFixed(1);
        const pctSaved = Math.max(0, Math.round((savingsBytes / originalSize) * 100));

        console.log(
          `   ✅ [COMPRESSED] ${bucket}/${filePath} | ${origKB}KB ➔ ${newKB}KB (-${pctSaved}%) [Cache: 31536000]`
        );

      } catch (err) {
        console.error(`   ❌ Compression error for ${bucket}/${filePath}:`, err.message);
      }
    }
  }

  const totalSavedMB = ((totalOriginalBytes - totalNewBytes) / (1024 * 1024)).toFixed(2);
  const totalOrigMB = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalNewMB = (totalNewBytes / (1024 * 1024)).toFixed(2);
  const overallSavedPct = totalOriginalBytes > 0
    ? Math.round(((totalOriginalBytes - totalNewBytes) / totalOriginalBytes) * 100)
    : 0;

  console.log('\n=========================================================');
  console.log('🎉 IN-PLACE STORAGE IMAGE COMPRESSION COMPLETED!');
  console.log('=========================================================');
  console.log(` Total Images Processed  : ${processedCount}`);
  console.log(` Skipped / Non-Images    : ${skippedCount}`);
  console.log(` Original Total Size     : ${totalOrigMB} MB`);
  console.log(` Compressed Total Size   : ${totalNewMB} MB`);
  console.log(` Total Storage Saved     : ${totalSavedMB} MB (-${overallSavedPct}%)`);
  console.log(` Cache Control Header    : 31536000 (1 Year Browser Caching Enforced)`);
  console.log('=========================================================\n');
}

compressAndReplaceStorageMedia().catch((err) => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});
