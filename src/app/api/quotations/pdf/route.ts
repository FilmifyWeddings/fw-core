import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML, getEmbeddedCustomFontsBase64CSS } from '@/lib/pdf-html-generator';

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
    console.warn('[Puppeteer Core] @sparticuz/chromium executable path notice:', e);
  }

  const systemPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
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
  const timeoutId = setTimeout(() => controller.abort(), 2500);

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
    console.warn('[Server Image Inliner Fast Warning] Skipping slow/unreachable image:', fetchUrl);
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

// POST /api/quotations/pdf - CANVA-STYLE HIGH-DPI CANVAS SNAPSHOT SERVER PDF COMPILATION ENGINE
export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
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

    // ── CANVA-STYLE HIGH-DPI CANVAS SNAPSHOT COMPILATION ENGINE (100% VISUAL PARITY) ──
    if (rawImages && Array.isArray(rawImages) && rawImages.length > 0) {
      console.log('[Canva-Style PDF Server Engine] Compiling', rawImages.length, 'page snapshots into A4 vector PDF...');
      
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

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Standard A4 PDF page dimensions (210mm x 297mm = 595.28 x 841.89 pts)
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

      console.log('[Canva-Style PDF Server Engine] Successfully compiled PDF (Bytes:', pdfBytes.length, ')');

      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // ── FALLBACK SERVER PUPPETEER RENDER ENGINE ──
    if (!targetId && !clientSnapshotHTML) {
      return NextResponse.json({ error: 'quotationId, pageImages, or htmlContent is required' }, { status: 400 });
    }

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
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Italiana&family=Josefin+Sans:wght@300;400;600;700&family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Prata&family=Tenor+Sans&display=swap" rel="stylesheet" />
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
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
    } catch (e) {}

    try {
      browser = await puppeteer.launch({
        args: chromiumArgs,
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
      await page.setContent(fullHTML, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 25000 });

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

      const rawBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      pdfBuffer = new Uint8Array(rawBuffer);
      await browser.close();
      browser = null;
    } catch (launchErr) {
      console.warn('[Puppeteer Core Launcher Warning, falling back to pdf-lib server renderer]:', launchErr);
      if (browser) {
        try { await browser.close(); } catch (e) {}
        browser = null;
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Puppeteer rendering unavailable' }, { status: 500 });
    }

    const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    console.error('[POST /api/quotations/pdf Engine Error]:', err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
