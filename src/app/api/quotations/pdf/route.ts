import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML } from '@/lib/pdf-html-generator';

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

// POST /api/quotations/pdf - Canva-Grade Direct HTML Memory PDF Engine Route
export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    const body = await req.json();
    const { quotationId, templateId, filename, content_json } = body;
    const targetId = quotationId || templateId;

    if (!targetId) {
      return NextResponse.json({ error: 'quotationId or templateId is required' }, { status: 400 });
    }

    // 1. Fetch data from Supabase if content_json was not passed directly
    let documentData = content_json;
    if (!documentData) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', targetId)
        .maybeSingle();

      if (doc?.content_json) {
        documentData = doc.content_json;
      }
    }

    // 2. Sync live content JSON into Supabase DB asynchronously
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

    // 3. Generate 100% Complete Standalone HTML Document with Embedded Base64 Custom Fonts & Vectors
    const htmlContent = renderQuotationToHTML(documentData || {});

    console.log('[Puppeteer Server Engine] --------------------------------------------------');
    console.log('[Puppeteer Server Engine] Rendering Direct HTML Payload (Length:', htmlContent.length, 'bytes)');

    // 4. Launch Puppeteer Core with Headless Chromium
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

    // 5. Inject HTML string directly into Chromium memory
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 45000 });

    // 6. Wait for all image URLs (including Supabase Storage bucket URLs) & fonts load
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }

      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth !== 0) return Promise.resolve(true);
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          });
        })
      );
    });

    // 7. Explicit Font Ready Lock
    await page.evaluateHandle('document.fonts.ready');

    // 8. Generate Deterministic A4 Vector PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    console.log('[Puppeteer Server Engine] Successfully Generated PDF Buffer Size:', pdfBuffer.length, 'bytes');

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
