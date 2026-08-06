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

// POST /api/pdf/render - Dedicated Server-Side Headless Chromium PDF Export Route
export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    const body = await req.json();
    const { templateId, filename } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // 1. Construct dedicated unauthenticated PDF Preview URL (/pdf-preview/[id])
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const requestedUrl = `${protocol}://${host}/pdf-preview/${templateId}`;

    console.log('[Puppeteer Engine] --------------------------------------------------');
    console.log('[Puppeteer Engine] Requested URL:', requestedUrl);
    console.log('[Puppeteer Engine] Auth State: Unauthenticated Dedicated PDF Preview Route');

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

    // 3. Navigate exclusively to /pdf-preview/[id]
    const navigationResponse = await page.goto(requestedUrl, { waitUntil: 'networkidle0', timeout: 35000 });
    const httpStatus = navigationResponse?.status() || 200;
    const finalUrl = page.url();

    console.log('[Puppeteer Engine] Final URL after redirects:', finalUrl);
    console.log('[Puppeteer Engine] HTTP Status Code:', httpStatus);
    console.log('[Puppeteer Engine] --------------------------------------------------');

    // Security & Route Integrity Assertion
    if (finalUrl.includes('/login') || finalUrl.includes('/auth') || finalUrl.includes('/workspace')) {
      console.error('[Puppeteer Engine CRITICAL ERROR] Redirected to invalid route:', finalUrl);
      throw new Error(`Puppeteer redirected away from /pdf-preview to ${finalUrl}`);
    }

    // Wait for document fonts to finish loading
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
