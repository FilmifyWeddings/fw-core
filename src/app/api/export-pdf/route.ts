import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, url, filename = 'Quotation_Proposal.pdf' } = body;

    let chromiumModule: any = null;
    let puppeteerModule: any = null;

    try {
      chromiumModule = (await import('@sparticuz/chromium')).default;
      puppeteerModule = await import('puppeteer-core');
    } catch (e: any) {
      console.warn('[Puppeteer Import Warning]:', e?.message);
      return NextResponse.json({ error: 'PDF generation module unavailable on server' }, { status: 500 });
    }

    let executablePath = process.env.CHROMIUM_PATH || '';
    if (!executablePath && chromiumModule && typeof chromiumModule.executablePath === 'function') {
      try {
        executablePath = await chromiumModule.executablePath();
      } catch (err: any) {
        console.warn('[Chromium Executable Path Warning]:', err?.message);
      }
    }

    if (!executablePath) {
      try {
        const fs = await import('fs');
        const commonPaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            executablePath = p;
            break;
          }
        }
      } catch (fsErr) {
        console.warn('[Chromium Common Paths Search Warning]:', fsErr);
      }
    }

    if (!executablePath) {
      return NextResponse.json({ error: 'Chromium binary path not configured on server' }, { status: 500 });
    }

    const browser = await puppeteerModule.launch({
      args: chromiumModule?.args || ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    } else {
      await browser.close();
      return NextResponse.json({ error: 'No HTML or URL provided for PDF generation' }, { status: 400 });
    }

    // Ensure all images and custom font-faces are fully loaded
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: '794px',
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[API export-pdf Route Error]:', err);
    return NextResponse.json({ error: err.message || 'PDF Export Failed' }, { status: 500 });
  }
}
