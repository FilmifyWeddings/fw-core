import fs from 'fs';
import path from 'path';

function searchDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchDirectory(fullPath);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json') || file.startsWith('.env')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('postgres://') || content.includes('postgresql://') || content.includes('SUPABASE_DB_')) {
          console.log(`Found match in: ${fullPath}`);
          // Print matching line
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('postgres://') || line.includes('postgresql://') || line.includes('SUPABASE_DB_')) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching for database connection strings...');
searchDirectory('.');
