import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Locate Chromium executable path cross-platform (Linux VPS, Windows, Mac)
async function getChromiumExecutablePath(): Promise<string | undefined> {
  const fs = await import('fs');

  const linuxPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
    process.env.CHROME_PATH
  ];

  for (const path of linuxPaths) {
    if (path && fs.existsSync(path)) {
      return path;
    }
  }

  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const winPath of winPaths) {
    if (winPath && fs.existsSync(winPath)) {
      return winPath;
    }
  }

  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const path = await chromium.executablePath();
    if (path) return path;
  } catch (e) {
    console.warn('[Puppeteer Core] @sparticuz/chromium executable path notice:', e);
  }

  return undefined;
}

// POST /api/quotations/pdf - Dedicated Server-Side PDF Generation Route
export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    const body = await req.json();
    const { quotationId, templateId, filename, content_json } = body;
    const targetId = quotationId || templateId;

    if (!targetId) {
      return NextResponse.json({ error: 'quotationId or templateId is required' }, { status: 400 });
    }

    // 1. Sync live content JSON into Supabase DB before Puppeteer renders
    if (content_json && targetId) {
      try {
        await supabaseAdmin
          .from('quotation_documents')
          .upsert({
            template_id: targetId,
            content_json: content_json,
            updated_at: new Date().toISOString()
          }, { onConflict: 'template_id' });
      } catch (e: any) {
        console.warn('[Supabase Sync Notice]:', e);
      }
    }

    // 2. Determine target PDF Preview URL (Internal Loopback vs Host URL)
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const port = process.env.PORT || '3000';
    
    // Try loopback address first to avoid external network/proxy redirects
    const localUrl = `http://127.0.0.1:${port}/pdf-preview/${targetId}`;
    const publicUrl = `${protocol}://${host}/pdf-preview/${targetId}`;

    console.log('[Puppeteer Server Engine] --------------------------------------------------');
    console.log('[Puppeteer Server Engine] Attempting Local Loopback URL:', localUrl);

    // 3. Launch Puppeteer Core with Headless Chromium
    const puppeteer = (await import('puppeteer-core')).default;
    const executablePath = await getChromiumExecutablePath();

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--font-render-hinting=none'
    ];

    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: {
        width: 1280,
        height: 1810,
        deviceScaleFactor: 2
      },
      executablePath: executablePath || undefined,
      headless: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1810, deviceScaleFactor: 2 });

    // 4. Navigate to PDF Preview Route
    let navigationResponse = await page.goto(localUrl, { waitUntil: 'networkidle0', timeout: 15000 }).catch(async () => {
      console.warn('[Puppeteer Engine] Local loopback navigation timeout, trying public URL:', publicUrl);
      return await page.goto(publicUrl, { waitUntil: 'networkidle0', timeout: 25000 });
    });

    const finalUrl = page.url();
    console.log('[Puppeteer Server Engine] Final URL after navigation:', finalUrl);

    // Assert Route Integrity (Ensure non-redirected pdf-preview route)
    if (finalUrl.includes('/login') || finalUrl.includes('/auth') || finalUrl.includes('/workspace')) {
      console.error('[Puppeteer Server Engine ERROR] Redirected away to:', finalUrl);
      throw new Error(`Puppeteer redirected away from /pdf-preview to ${finalUrl}`);
    }

    // Wait for canvas element to hydrate
    await page.waitForSelector('#quotation-full-canvas', { timeout: 15000 }).catch((e: any) => {
      console.warn('[Puppeteer Server Engine] Canvas selector wait notice:', e?.message);
    });

    // Wait for document web fonts to finish loading
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    // 5. Generate Deterministic A4 Vector PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    const safeFilename = (filename || `${targetId}-Quotation.pdf`)
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
    console.error('[POST /api/quotations/pdf] Error:', err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
