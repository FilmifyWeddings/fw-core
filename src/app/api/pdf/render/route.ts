import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Utility to locate Chromium executable path cross-platform (Local Dev vs Serverless)
async function getChromiumExecutablePath(): Promise<string | undefined> {
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const path = await chromium.executablePath();
    if (path) return path;
  } catch (e) {
    console.warn('[Puppeteer API] @sparticuz/chromium executable path notice:', e);
  }

  // Fallback paths for Windows / Mac local development environments
  const fs = await import('fs');
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.CHROME_PATH
  ];

  for (const winPath of winPaths) {
    if (winPath && fs.existsSync(winPath)) {
      return winPath;
    }
  }

  return undefined;
}

// POST /api/pdf/render - Server-Side Headless Chromium PDF Export Route
export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    const body = await req.json();
    const { templateId, filename, content_json } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // 1. Fetch document from Supabase DB if content_json is not provided
    let documentData = content_json;
    if (!documentData) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', templateId)
        .maybeSingle();

      if (doc?.content_json) {
        documentData = doc.content_json;
      } else {
        const { data: legacy } = await supabaseAdmin
          .from('quotations')
          .select('content_json')
          .or(`id.eq.${templateId},quotation_number.eq.${templateId}`)
          .maybeSingle();
        documentData = legacy?.content_json || {};
      }
    }

    // 2. Launch Puppeteer Core with Headless Chromium
    const puppeteer = (await import('puppeteer-core')).default;
    const chromium = (await import('@sparticuz/chromium')).default;
    const executablePath = await getChromiumExecutablePath();

    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      defaultViewport: {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      },
      executablePath: executablePath || await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    // 3. Construct origin URL or preview HTML
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const previewUrl = `${protocol}://${host}/workspace/quotations/builder/templet/${templateId}`;

    // Navigate to builder route or load HTML directly
    try {
      await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch {
      await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    // Evaluate font loading inside Chromium page
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    // 4. Generate Deterministic A4 PDF Vector/Raster Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    const safeFilename = (filename || `${templateId}-Quotation.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    console.error('[POST /api/pdf/render] Error:', err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
