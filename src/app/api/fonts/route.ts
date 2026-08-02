import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface FontMetadata {
  name: string;
  family: string;
  fileUrl: string;
  format: 'truetype' | 'opentype';
  category: 'Custom Fonts';
}

function parseFontName(filename: string): string {
  // Remove extension
  let baseName = filename.replace(/\.(ttf|otf)$/i, '');

  // Known hash suffix replacements / cleanups
  baseName = baseName
    .replace(/-BF[a-f0-9]+$/i, '')
    .replace(/-qZa[a-f0-9]+$/i, '')
    .replace(/-jEP[a-f0-9]+$/i, '')
    .replace(/-vnvel$/i, '');

  // Add spaces before capital letters if preceded by lowercase letter
  baseName = baseName.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace hyphens and underscores with spaces
  baseName = baseName.replace(/[-_]+/g, ' ');

  // Capitalize each word nicely
  const words = baseName.trim().split(/\s+/).map(word => {
    if (!word) return '';
    if (word.toLowerCase() === 'demoregular') return 'Demo Regular';
    if (word.toLowerCase() === 'morgenaregular') return 'Morgena Regular';
    if (word.toLowerCase() === 'auroragirl') return 'Aurora Girl';
    if (word.toLowerCase() === 'personaluse') return 'Personal Use';
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return words.join(' ').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'custom-fonts');
    if (!fs.existsSync(fontsDir)) {
      return NextResponse.json({ fonts: [] });
    }

    const files = fs.readdirSync(fontsDir);
    const fontMap = new Map<string, FontMetadata>();

    files.forEach((file) => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.ttf' || ext === '.otf') {
        const cleanName = parseFontName(file);
        const format = ext === '.otf' ? 'opentype' : 'truetype';
        
        // Prefer .otf if both exist, or use first found
        if (!fontMap.has(cleanName) || ext === '.otf') {
          fontMap.set(cleanName, {
            name: cleanName,
            family: `'${cleanName}', sans-serif`,
            fileUrl: `/custom-fonts/${file}`,
            format,
            category: 'Custom Fonts',
          });
        }
      }
    });

    const fonts = Array.from(fontMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error('Error scanning custom fonts:', error);
    return NextResponse.json({ fonts: [], error: 'Failed to scan fonts' }, { status: 500 });
  }
}
