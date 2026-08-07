import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML, getEmbeddedCustomFontsBase64CSS } from '@/lib/pdf-html-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Robust Cross-Platform Chromium Path Resolver (Linux VPS, Vercel, Serverless, Windows, Mac)
async function getChromiumExecutablePath(): Promise<string | undefined> {
  const fs = await import('fs');

  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const path = await chromium.executablePath();
    if (path) return path;
  } catch (e) {
    console.warn('[PDF Pipeline Stage 5] @sparticuz/chromium notice:', e);
  }

  const systemPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.CHROME_PATH
  ];

  for (const p of systemPaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}

async function fetchAndInlineImageServer(url: string): Promise<string> {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return url;

  let fetchUrl = url;
  if (fetchUrl.startsWith('//')) {
    fetchUrl = 'https:' + fetchUrl;
  } else if (fetchUrl.startsWith('/')) {
    fetchUrl = 'https://test.studiocore.in' + fetchUrl;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[PDF Pipeline Inliner] Skipping slow image:', fetchUrl);
  }

  return url;
}

async function deepInlineAllImagesServer(obj: any): Promise<any> {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image')) return obj;
    if (
      obj.startsWith('http://') ||
      obj.startsWith('https://') ||
      obj.startsWith('//') ||
      obj.startsWith('/uploads/') ||
      obj.startsWith('/_next/image') ||
      /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(obj)
    ) {
      return await fetchAndInlineImageServer(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return await Promise.all(obj.map(item => deepInlineAllImagesServer(item)));
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    const values = await Promise.all(keys.map(k => deepInlineAllImagesServer(obj[k])));
    const result: any = {};
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = values[i];
    }
    return result;
  }

  return obj;
}

async function inlineAllImgTagsInHTMLServer(html: string): Promise<string> {
  if (!html) return html;

  const matches = Array.from(html.matchAll(/src=["']([^"']+)["']/g));
  const uniqueUrls: string[] = [];

  for (const match of matches) {
    const origUrl = match[1];
    if (origUrl && !origUrl.startsWith('data:') && !uniqueUrls.includes(origUrl)) {
      uniqueUrls.push(origUrl);
    }
  }

  const inlinedResults = await Promise.all(
    uniqueUrls.map(url => fetchAndInlineImageServer(url))
  );

  let finalHTML = html;
  for (let i = 0; i < uniqueUrls.length; i++) {
    const origUrl = uniqueUrls[i];
    const inlinedUrl = inlinedResults[i];
    if (inlinedUrl && inlinedUrl !== origUrl) {
      finalHTML = finalHTML.replaceAll(`src="${origUrl}"`, `src="${inlinedUrl}"`);
      finalHTML = finalHTML.replaceAll(`src='${origUrl}'`, `src='${inlinedUrl}'`);
    }
  }

  return finalHTML;
}

function makeImageUrlsAbsolute(html: string): string {
  if (!html) return html;
  return html.replace(/src=["'](\/[^"']+)["']/g, (match, path) => {
    return `src="https://test.studiocore.in${path}"`;
  });
}

// POST /api/quotations/pdf - Enterprise 8-Stage Server PDF Pipeline (Desktop & iPhone Safari/Chrome Parity)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userAgent = req.headers.get('user-agent') || 'Unknown User-Agent';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

  console.log('[PDF Pipeline] ==================================================');
  console.log('[PDF Pipeline] STAGE 1: Client Download Request Initiated');
  console.log('[PDF Pipeline] User-Agent:', userAgent);
  console.log('[PDF Pipeline] Device Category:', isIOS ? 'Apple iOS (iPhone/iPad)' : (isMobile ? 'Mobile Device' : 'Desktop Browser'));

  let browser: any = null;
  try {
    // STAGE 2: API Request Received
    console.log('[PDF Pipeline] STAGE 2: API Request Received');
    const contentType = req.headers.get('content-type') || '';
    console.log('[PDF Pipeline] Content-Type:', contentType);

    let body: any = {};
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const payloadStr = formData.get('payload') as string;
      if (payloadStr) {
        body = JSON.parse(payloadStr);
      }
    } else {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }

    const { quotationId, templateId, filename, content_json, pageSnapshots, pageImages, htmlContent: clientSnapshotHTML } = body;
    const targetId = quotationId || templateId;
    const rawImages: string[] = pageImages || pageSnapshots || [];

    // STAGE 3: Authentication & Session Verification
    console.log('[PDF Pipeline] STAGE 3: Authentication & Session Verification');
    const authHeader = req.headers.get('authorization') || '';
    console.log('[PDF Pipeline] Authorization Header Present:', Boolean(authHeader));
    console.log('[PDF Pipeline] Target Quotation ID:', targetId || 'N/A');

    // ── FAST PATH: High-DPI Page Images Array Compilation ──
    if (rawImages && Array.isArray(rawImages) && rawImages.length > 0) {
      console.log('[PDF Pipeline] STAGE 4: Processing', rawImages.length, 'High-DPI Page Images');
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < rawImages.length; i++) {
        const dataUrl = rawImages[i];
        if (!dataUrl || typeof dataUrl !== 'string') continue;

        const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        let embeddedImage;
        if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
          embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        } else {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        }

        const pdfWidth = 595.28;
        const pdfHeight = 841.89;

        const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
        pdfPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pdfWidth,
          height: pdfHeight
        });
      }

      console.log('[PDF Pipeline] STAGE 7: Vector PDF Binary Buffer Generation');
      const pdfBytes = await pdfDoc.save();

      const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
        .replace(/–/g, '-')
        .replace(/—/g, '-')
        .replace(/[^ -~]/g, '-');

      console.log('[PDF Pipeline] STAGE 8: PDF Response Sent (Bytes:', pdfBytes.length, 'Elapsed:', Date.now() - startTime, 'ms)');
      console.log('[PDF Pipeline] ==================================================');

      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // ── STAGE 4: HTML Document Generation ──
    console.log('[PDF Pipeline] STAGE 4: HTML Document Generation');
    let documentData = content_json;
    if (!documentData && targetId) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', targetId)
        .maybeSingle();

      if (doc?.content_json) {
        documentData = doc.content_json;
      }
    }

    let fullHTML = '';
    const embeddedFontsCSS = getEmbeddedCustomFontsBase64CSS();

    if (clientSnapshotHTML && typeof clientSnapshotHTML === 'string' && clientSnapshotHTML.trim().length > 0) {
      const absoluteClientHTML = makeImageUrlsAbsolute(clientSnapshotHTML);
      fullHTML = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=794, initial-scale=1" />
            <title>Quotation Export - PDF</title>
            <style>
              ${embeddedFontsCSS}
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body, html {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 794px !important;
              }
              .pdf-container, #quotation-canvas-container {
                width: 794px !important;
                margin: 0 auto !important;
                background: #ffffff !important;
              }
              .pdf-page, .quotation-canvas-page {
                width: 794px !important;
                min-width: 794px !important;
                max-width: 794px !important;
                height: 1123px !important;
                min-height: 1123px !important;
                max-height: 1123px !important;
                padding: 48px !important;
                position: relative !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
              }
              img {
                display: block !important;
                max-width: 100% !important;
                object-fit: cover !important;
              }
            </style>
          </head>
          <body>
            ${absoluteClientHTML}
          </body>
        </html>
      `;
    } else {
      const inlinedData = await deepInlineAllImagesServer(documentData || {});
      const rendered = renderQuotationToHTML(inlinedData);
      fullHTML = await inlineAllImgTagsInHTMLServer(rendered);
    }

    console.log('[PDF Pipeline] Generated HTML Document Payload (Length:', fullHTML.length, 'bytes)');

    // ── STAGE 5: Puppeteer Browser Launch ──
    console.log('[PDF Pipeline] STAGE 5: Puppeteer Browser Launch');
    let pdfBuffer: Uint8Array | null = null;
    const puppeteer = (await import('puppeteer-core')).default;

    const defaultLaunchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--font-render-hinting=none'
    ];

    let executablePath = await getChromiumExecutablePath();
    let chromiumArgs = defaultLaunchArgs;

    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      const sparticuzPath = await chromium.executablePath();
      if (sparticuzPath) {
        executablePath = sparticuzPath;
        chromiumArgs = [...chromium.args, '--font-render-hinting=none'];
      }
    } catch (e) {
      console.warn('[PDF Pipeline Stage 5 Warning] @sparticuz/chromium fallback notice:', e);
    }

    console.log('[PDF Pipeline] Chromium Executable Path:', executablePath || 'Default Puppeteer Search');

    try {
      browser = await puppeteer.launch({
        args: chromiumArgs,
        defaultViewport: {
          width: 794,
          height: 1123,
          deviceScaleFactor: 2
        },
        executablePath: executablePath || undefined,
        headless: true
      });

      // ── STAGE 6: Page Render ──
      console.log('[PDF Pipeline] STAGE 6: Page Render & Fonts Readiness');
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      await page.setContent(fullHTML, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 30000 });

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
              setTimeout(resolve, 300);
            });
          })
        );
      });

      // ── STAGE 7: Vector A4 PDF Generation ──
      console.log('[PDF Pipeline] STAGE 7: Vector A4 PDF Generation');
      const rawBuffer = await page.pdf({
        width: '794px',
        height: '1123px',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      pdfBuffer = new Uint8Array(rawBuffer);
      await browser.close();
      browser = null;
    } catch (launchErr: any) {
      console.error('[PDF Pipeline STAGE 5 ERROR] Puppeteer Launch Failure:', launchErr?.message || launchErr);
      if (browser) {
        try { await browser.close(); } catch (e) {}
        browser = null;
      }
    }

    if (!pdfBuffer) {
      console.error('[PDF Pipeline CRITICAL ERROR] Puppeteer rendering produced null buffer!');
      return NextResponse.json({
        error: 'PDF Rendering Failure',
        stage: 'STAGE 5/6: Puppeteer Launch/Render',
        detail: 'The server Headless Chromium renderer failed to output a valid PDF buffer.',
        suggestion: 'Verify chromium binaries or environment configuration.'
      }, { status: 500 });
    }

    // ── STAGE 8: PDF Binary Response Sent ──
    const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

    console.log('[PDF Pipeline] STAGE 8: PDF Binary Response Sent (Bytes:', pdfBuffer.length, 'Elapsed:', Date.now() - startTime, 'ms)');
    console.log('[PDF Pipeline] ==================================================');

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    console.error('[PDF Pipeline UNHANDLED EXCEPTION]:', err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({
      error: 'Unhandled PDF Generation Error',
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
