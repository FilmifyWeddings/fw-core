import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML, getEmbeddedCustomFontsBase64CSS } from '@/lib/pdf-html-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function getChromiumExecutablePath(): Promise<string | undefined> {
  const fs = await import('fs');

  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const path = await chromium.executablePath();
    if (path) return path;
  } catch (e) {
    console.warn('[PDF Server Pipeline] @sparticuz/chromium executable path notice:', e);
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

// POST /api/quotations/pdf - Lightweight Server Vector PDF Generation Pipeline
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userAgent = req.headers.get('user-agent') || 'Unknown User-Agent';
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
  const origin = req.headers.get('origin') || 'Unknown Origin';

  console.log('[PDF Server Pipeline] ==================================================');
  console.log('[PDF Server Pipeline] STAGE 1: Client Download Request Initiated');
  console.log('[PDF Server Pipeline] Client IP:', clientIp);
  console.log('[PDF Server Pipeline] Origin:', origin);
  console.log('[PDF Server Pipeline] User-Agent:', userAgent);

  let browser: any = null;
  try {
    // STAGE 2: Payload Parsing & Payload Size Diagnostics
    console.log('[PDF Server Pipeline] STAGE 2: Request Payload Parsing');
    const contentType = req.headers.get('content-type') || '';
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
      } catch (e: any) {
        console.error('[PDF Server Pipeline STAGE 2 ERROR] JSON Parsing Failed:', e.message);
        body = {};
      }
    }

    const payloadSize = JSON.stringify(body).length;
    const { quotationId, templateId, filename, content_json, pageSnapshots, pageImages } = body;
    const targetId = quotationId || templateId;
    const rawImages: string[] = pageImages || pageSnapshots || [];

    console.log('[PDF Server Pipeline] Payload Size Received:', payloadSize, 'bytes (~' + (payloadSize / 1024).toFixed(2) + ' KB)');
    console.log('[PDF Server Pipeline] Target Quotation ID:', targetId || 'N/A');

    // STAGE 3: Server-Side Vector HTML Generation
    console.log('[PDF Server Pipeline] STAGE 3: Server-Side Vector HTML Generation');
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

    // ── OPTIONAL FAST-PATH: If Base64 pageImages are present ──
    if (rawImages && Array.isArray(rawImages) && rawImages.length > 0) {
      console.log('[PDF Server Pipeline] Fast-Path: Processing', rawImages.length, 'Page Snapshots');
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

      const pdfBytes = await pdfDoc.save();
      const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
        .replace(/–/g, '-')
        .replace(/—/g, '-')
        .replace(/[^ -~]/g, '-');

      console.log('[PDF Server Pipeline] Fast-Path PDF Generated (Bytes:', pdfBytes.length, 'Elapsed:', Date.now() - startTime, 'ms)');
      console.log('[PDF Server Pipeline] ==================================================');

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

    // ── PREFERRED CANVA-GRADE PATH: Direct HTML Memory Vector PDF Generation ──
    const inlinedData = await deepInlineAllImagesServer(documentData || {});
    const rendered = renderQuotationToHTML(inlinedData);
    const fullHTML = await inlineAllImgTagsInHTMLServer(rendered);

    console.log('[PDF Server Pipeline] Generated Standalone HTML Payload (Length:', fullHTML.length, 'bytes)');

    // STAGE 4: Puppeteer Launch
    console.log('[PDF Server Pipeline] STAGE 4: Puppeteer Launch');
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
      console.warn('[PDF Server Pipeline] @sparticuz/chromium fallback notice:', e);
    }

    console.log('[PDF Server Pipeline] Chromium Executable Path:', executablePath || 'Default Search');

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

    // STAGE 5: Page Render & Fonts Lock
    console.log('[PDF Server Pipeline] STAGE 5: Page Render & Fonts Lock');
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Track pending network requests to diagnose slow or hanging mobile resources
    const pendingRequests = new Set<string>();
    page.on('request', (req: any) => pendingRequests.add(req.url()));
    page.on('requestfinished', (req: any) => pendingRequests.delete(req.url()));
    page.on('requestfailed', (req: any) => pendingRequests.delete(req.url()));

    // Set DOM content with domcontentloaded (instant < 50ms) to prevent mobile networkidle0 timeout
    try {
      await page.setContent(fullHTML, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e: any) {
      console.warn('[PDF Server Pipeline] setContent Warning (Pending Requests:', Array.from(pendingRequests), '):', e.message);
    }

    if (pendingRequests.size > 0) {
      console.log('[PDF Server Pipeline] Pending Network Requests Before Render:', Array.from(pendingRequests));
    }

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

    // STAGE 6: Vector A4 PDF Generation
    console.log('[PDF Server Pipeline] STAGE 6: Vector A4 PDF Generation');
    const rawBuffer = await page.pdf({
      width: '794px',
      height: '1123px',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    const pdfBuffer = new Uint8Array(rawBuffer);
    await browser.close();
    browser = null;

    const durationMs = Date.now() - startTime;
    console.log('[PDF Server Pipeline] STAGE 7: PDF Response Delivered');
    console.log('[PDF Server Pipeline] Generated PDF Buffer Size:', pdfBuffer.length, 'bytes (~' + (pdfBuffer.length / 1024).toFixed(2) + ' KB)');
    console.log('[PDF Server Pipeline] PDF Generation Duration:', durationMs, 'ms');
    console.log('[PDF Server Pipeline] ==================================================');

    const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

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
    const durationMs = Date.now() - startTime;
    console.error('[PDF Server Pipeline ERROR] Duration:', durationMs, 'ms Exception:', err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({
      error: 'Server PDF Pipeline Failure',
      stage: 'Server HTML/Chromium Render',
      detail: err.message || 'Internal Server Error',
      durationMs: durationMs
    }, { status: 500 });
  }
}
