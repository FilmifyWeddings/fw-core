import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML, getEmbeddedCustomFontsBase64CSS } from '@/lib/pdf-html-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Locate Chromium executable path cross-platform (Linux VPS, Windows, Mac) fallback
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
    const body = await req.json();
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

        // Dynamic PDF page height matching actual section height (Zero Page Splitting, Zero White Gaps)
        const pdfWidth = 595.28;
        const pdfHeight = imgWidth > 0 ? (imgHeight / imgWidth) * pdfWidth : 841.89;

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
      fullHTML = renderQuotationToHTML(documentData || {});
    }

    const puppeteer = (await import('puppeteer-core')).default;
    const executablePath = await getChromiumExecutablePath();

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
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
          });
        })
      );
    });

    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();
    browser = null;

    const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
