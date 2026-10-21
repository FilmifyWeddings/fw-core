const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'save' or 'restore'
const chunksDir = path.join(__dirname, '..', '.next', 'static', 'chunks');
const backupDir = path.join(__dirname, '..', '.next-chunks-backup');

function copyDir(src, dest, overwrite = true) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, overwrite);
    } else {
      if (overwrite || !fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (_) {}
      }
    }
  }
}

if (mode === 'save') {
  if (fs.existsSync(chunksDir)) {
    try {
      copyDir(chunksDir, backupDir, true);
      console.log('✅ [Chunks] Preserved existing static chunks for zero-downtime client transitions.');
    } catch (e) {
      console.warn('⚠️ [Chunks] Could not backup chunks:', e.message);
    }
  }
} else if (mode === 'restore') {
  if (fs.existsSync(backupDir)) {
    try {
      copyDir(backupDir, chunksDir, false); // false = do NOT overwrite newer chunks!
      console.log('✅ [Chunks] Restored historical static chunks into active deployment directory.');
    } catch (e) {
      console.warn('⚠️ [Chunks] Could not restore chunks:', e.message);
    }
  }
}
