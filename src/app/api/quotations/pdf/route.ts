import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML } from '@/lib/pdf-html-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Bounded in-memory image Base64 cache + in-flight request deduplication (per Node worker)
const gPdf = globalThis as any;
const IMAGE_DATA_URI_CACHE: Map<string, string> =
  gPdf.__scPdfImageCache || (gPdf.__scPdfImageCache = new Map<string, string>());
const IMAGE_INFLIGHT_MAP: Map<string, Promise<string>> =
  gPdf.__scPdfImageInflight || (gPdf.__scPdfImageInflight = new Map<string, Promise<string>>());

function cacheImageDataUri(key: string, dataUri: string) {
  if (!dataUri.startsWith('data:')) return;
  if (IMAGE_DATA_URI_CACHE.size >= 80) {
    const firstKey = IMAGE_DATA_URI_CACHE.keys().next().value;
    if (firstKey) IMAGE_DATA_URI_CACHE.delete(firstKey);
  }
  IMAGE_DATA_URI_CACHE.set(key, dataUri);
}

async function launchIsolatedPdfBrowser(): Promise<any> {
  const puppeteer = (await import('puppeteer-core')).default;
  const defaultLaunchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--font-render-hinting=none',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-zygote'
  ];

  let executablePath = await getChromiumExecutablePath();
  let chromiumArgs = defaultLaunchArgs;

  if (!executablePath && process.platform !== 'win32') {
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
  }

  return await puppeteer.launch({
    args: chromiumArgs,
    defaultViewport: {
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    },
    executablePath: executablePath || undefined,
    headless: true
  });
}

async function getChromiumExecutablePath(): Promise<string | undefined> {
  const fs = await import('fs');

  const systemPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.CHROME_PATH
  ];

  for (const p of systemPaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  if (process.platform !== 'win32') {
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      const path = await chromium.executablePath();
      if (path && fs.existsSync(path)) return path;
    } catch (e) {
      console.warn('[PDF Server Pipeline] @sparticuz/chromium executable path notice:', e);
    }
  }

  return undefined;
}

async function fetchAndInlineImageServer(url: string, requestOrigin?: string): Promise<string> {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return url;

  const cached = IMAGE_DATA_URI_CACHE.get(url);
  if (cached) return cached;

  const inflight = IMAGE_INFLIGHT_MAP.get(url);
  if (inflight) return inflight;

  const work = (async (): Promise<string> => {
    // 1. Local public/ disk fast-path (<2ms vs 3500ms external HTTP call)
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/_next/')) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const relClean = decodeURIComponent(url.split('?')[0]).replace(/^\/+/, '');
        const publicRoot = path.resolve(process.cwd(), 'public');
        const diskPath = path.resolve(publicRoot, relClean);
        if (diskPath.startsWith(publicRoot) && fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
          const ext = path.extname(diskPath).toLowerCase();
          const mimeMap: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
          };
          const mime = mimeMap[ext] || 'image/jpeg';
          const buf = fs.readFileSync(diskPath);
          if (buf.length <= 4 * 1024 * 1024) {
            const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
            cacheImageDataUri(url, dataUri);
            return dataUri;
          }
        }
      } catch (_) {}
    }

    let fetchUrl = url;
    if (fetchUrl.startsWith('//')) {
      fetchUrl = 'https:' + fetchUrl;
    } else if (fetchUrl.startsWith('/')) {
      fetchUrl = (requestOrigin || process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in') + fetchUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

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
        const buf = Buffer.from(arrayBuffer);
        if (buf.length <= 4 * 1024 * 1024) {
          const dataUri = `data:${contentType};base64,${buf.toString('base64')}`;
          cacheImageDataUri(url, dataUri);
          return dataUri;
        }
      }
    } catch (_) {
      clearTimeout(timeoutId);
      console.warn('[PDF Pipeline Inliner] Skipping slow image:', fetchUrl);
    }

    return url;
  })();

  IMAGE_INFLIGHT_MAP.set(url, work);
  try {
    return await work;
  } finally {
    IMAGE_INFLIGHT_MAP.delete(url);
  }
}

async function deepInlineAllImagesServer(obj: any, requestOrigin?: string): Promise<any> {
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
      return await fetchAndInlineImageServer(obj, requestOrigin);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return await Promise.all(obj.map(item => deepInlineAllImagesServer(item, requestOrigin)));
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    const values = await Promise.all(keys.map(k => deepInlineAllImagesServer(obj[k], requestOrigin)));
    const result: any = {};
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = values[i];
    }
    return result;
  }

  return obj;
}

async function inlineAllImgTagsInHTMLServer(html: string, requestOrigin?: string): Promise<string> {
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
    uniqueUrls.map(url => fetchAndInlineImageServer(url, requestOrigin))
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

  let page: any = null;
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
    const isDocumentIncomplete = !documentData ||
      !documentData.aboutUs ||
      !documentData.pageSequence ||
      !documentData.functionsPage ||
      Object.keys(documentData).length < 5;

    if (isDocumentIncomplete && targetId) {
      console.log('[PDF Server Pipeline] Document incomplete or missing from request, fetching authoritative database copy for:', targetId);
      const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      const { data: doc } = isIdUuid
        ? await supabaseAdmin
            .from('quotation_documents')
            .select('content_json')
            .or(`template_id.eq.${targetId},id.eq.${targetId}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await supabaseAdmin
            .from('quotation_documents')
            .select('content_json')
            .eq('template_id', targetId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

      if (doc?.content_json && typeof doc.content_json === 'object') {
        documentData = {
          ...doc.content_json,
          ...(documentData || {})
        };
        if (doc.content_json.aboutUs) documentData.aboutUs = doc.content_json.aboutUs;
        if (doc.content_json.pageSequence) documentData.pageSequence = doc.content_json.pageSequence;
        if (doc.content_json.primaryFont) documentData.primaryFont = doc.content_json.primaryFont;
        if (doc.content_json.secondaryFont) documentData.secondaryFont = doc.content_json.secondaryFont;
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
    const requestOrigin = req.nextUrl?.origin || (origin !== 'Unknown Origin' ? origin : undefined);
    const inlinedData = await deepInlineAllImagesServer(documentData || {}, requestOrigin);
    const rendered = renderQuotationToHTML(inlinedData);
    const fullHTML = await inlineAllImgTagsInHTMLServer(rendered, requestOrigin);

    console.log('[PDF Server Pipeline] Generated Standalone HTML Payload (Length:', fullHTML.length, 'bytes)');

    // STAGE 4: Isolated Headless Chromium Launch
    console.log('[PDF Server Pipeline] STAGE 4: Launching isolated headless Chromium instance');
    browser = await launchIsolatedPdfBrowser();

    // STAGE 5: Page Render & Fonts Lock
    console.log('[PDF Server Pipeline] STAGE 5: Page Render & Fonts Lock');
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Set DOM content with domcontentloaded (< 50ms) and bounded font/image readiness
    try {
      await page.setContent(fullHTML, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e: any) {
      console.warn('[PDF Server Pipeline] setContent Warning:', e.message);
    }

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 900))
          ]);
        } catch (e) {}
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
    return NextResponse.json({
      error: 'Server PDF Pipeline Failure',
      stage: 'Server HTML/Chromium Render',
      detail: err.message || 'Internal Server Error',
      durationMs: durationMs
    }, { status: 500 });
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// GET /api/quotations/pdf - Supports direct binary downloads
export async function GET(req: NextRequest) {
  const targetId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('templateId') || req.nextUrl.searchParams.get('quotationId');
  const filename = req.nextUrl.searchParams.get('filename') || `${targetId || 'Quotation'}.pdf`;

  if (!targetId) {
    return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
  }

  // Construct a simulated request for the shared POST pipeline
  const postReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({
      quotationId: targetId,
      templateId: targetId,
      filename
    })
  });

  return POST(postReq);
}

