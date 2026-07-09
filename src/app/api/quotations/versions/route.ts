import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

// Initialize Supabase Client with service key for backup sync
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(req: NextRequest) {
  try {
    const { clientName, canvasData, pricingSummary, coupleNames, quotationId } = await resJson(req);

    if (!clientName) {
      return NextResponse.json({ error: 'Client Name is required.' }, { status: 400 });
    }

    // Sanitize client name for directory structure
    const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
    if (!sanitizedClientName) {
      return NextResponse.json({ error: 'Invalid Client Name.' }, { status: 400 });
    }

    const clientDir = path.join(STORAGE_ROOT, sanitizedClientName, 'Quotations');
    
    // Ensure storage path exists
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    // Determine next version index by counting existing version files
    const existingFiles = fs.readdirSync(clientDir).filter(f => f.startsWith('V') && f.endsWith('.json'));
    const nextVersionIndex = existingFiles.length + 1;

    // Get current Date & Time formatted for filename (YYYY-MM-DD_HH-MM)
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');

    const filename = `V${nextVersionIndex}_${formattedDate}_${formattedTime}.json`;
    const relativePath = `${sanitizedClientName}/Quotations/${filename}`;
    const filePath = path.join(clientDir, filename);

    const versionPayload = {
      version_name: `V${nextVersionIndex}`,
      file_path: relativePath,
      client_name: sanitizedClientName,
      couple_names: coupleNames || '',
      canvas_data: canvasData,
      pricing_summary: pricingSummary,
      created_at: now.toISOString()
    };

    // Save JSON to local filesystem
    fs.writeFileSync(filePath, JSON.stringify(versionPayload, null, 2), 'utf8');

    // Attempt Supabase Sync (optional backup layer)
    try {
      await supabase.from('quotation_versions').insert([{
        quotation_id: quotationId || null,
        client_name: sanitizedClientName,
        file_path: relativePath,
        canvas_data: canvasData,
        pricing_summary: pricingSummary
      }]);
    } catch (dbErr: any) {
      console.warn('[Versions API] Supabase Sync Error:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Version ${nextVersionIndex} saved successfully.`,
      filePath: relativePath,
      version: `V${nextVersionIndex}`,
      timestamp: versionPayload.created_at
    });
  } catch (err: any) {
    console.error('[Versions API] Save Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const searchQuery = searchParams.get('search') || '';

    if (!fs.existsSync(STORAGE_ROOT)) {
      return NextResponse.json({ directories: [] });
    }

    const directories: any[] = [];

    // Scan the STORAGE_ROOT for client folders
    const clientFolders = fs.readdirSync(STORAGE_ROOT).filter(f => {
      const fullPath = path.join(STORAGE_ROOT, f);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const clientName of clientFolders) {
      const quotationsDir = path.join(STORAGE_ROOT, clientName, 'Quotations');
      if (!fs.existsSync(quotationsDir)) continue;

      const versionFiles = fs.readdirSync(quotationsDir).filter(f => f.endsWith('.json'));
      const versions: any[] = [];

      for (const file of versionFiles) {
        try {
          const content = fs.readFileSync(path.join(quotationsDir, file), 'utf8');
          const json = JSON.parse(content);
          versions.push({
            id: file,
            filename: file,
            filePath: json.file_path,
            versionName: json.version_name,
            coupleNames: json.couple_names || '',
            pricingSummary: json.pricing_summary,
            canvasData: json.canvas_data,
            createdAt: json.created_at
          });
        } catch (fileErr) {
          console.warn(`[Versions API] Error reading file ${file}:`, fileErr);
        }
      }

      // Sort versions newest first
      versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filter by search query if provided (matches client name or couple names)
      const matchesSearch = !searchQuery || 
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        versions.some(v => v.coupleNames.toLowerCase().includes(searchQuery.toLowerCase()));

      if (matchesSearch && versions.length > 0) {
        directories.push({
          clientName,
          versionsCount: versions.length,
          lastUpdated: versions[0]?.createdAt || '',
          versions
        });
      }
    }

    // Sort directories by last updated newest first
    directories.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    return NextResponse.json({ directories });
  } catch (err: any) {
    console.error('[Versions API] Load Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Utility to parse JSON body helper
async function resJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
