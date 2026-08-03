import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log("API reached");
  try {
    const body = await req.json();
    const { html, url, filename = 'Quotation_Proposal.pdf' } = body;

    let chromiumModule: any = null;
    let puppeteerModule: any = null;

    try {
      chromiumModule = (await import('@sparticuz/chromium')).default;
      puppeteerModule = await import('puppeteer-core');
    } catch (e: any) {
      console.error('[Puppeteer Import Error Stack Trace]:', e?.stack || e);
      return NextResponse.json({ error: 'PDF generation module unavailable on server', details: e?.message }, { status: 500 });
    }

    let executablePath = process.env.CHROMIUM_PATH || '';
    if (!executablePath && chromiumModule && typeof chromiumModule.executablePath === 'function') {
      try {
        executablePath = await chromiumModule.executablePath();
      } catch (err: any) {
        console.warn('[Chromium Executable Path Extraction Warning]:', err?.stack || err);
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
          '/usr/bin/google-chrome-stable',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            executablePath = p;
            break;
          }
        }
      } catch (fsErr: any) {
        console.warn('[Chromium Common Paths Search Warning]:', fsErr?.stack || fsErr);
      }
    }

    console.log("Executable:", executablePath);
    console.log("Using Chromium:", executablePath);

    if (!executablePath) {
      console.error('[PDF API Error]: No valid Chromium executable binary found on server environment.');
      return NextResponse.json({ 
        error: 'Chromium binary path not configured on server',
        hint: 'Please install chromium-browser or google-chrome-stable on the VPS server.'
      }, { status: 500 });
    }

    console.log('[Puppeteer Debug] Launching puppeteer process...');
    let browser: any = null;
    try {
      browser = await puppeteerModule.launch({
        args: chromiumModule?.args || ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
        executablePath,
        headless: true,
      });
      console.log('[Puppeteer Debug] Browser instance launched successfully.');
    } catch (launchErr: any) {
      console.error('[Puppeteer Launch Error Stack Trace]:', launchErr?.stack || launchErr);
      return NextResponse.json({ 
        error: 'Failed to launch Chromium browser process', 
        details: launchErr?.message,
        stack: launchErr?.stack 
      }, { status: 500 });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    try {
      if (url) {
        console.log('[Puppeteer Debug] Navigating to URL:', url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      } else if (html) {
        console.log('[Puppeteer Debug] Setting HTML content (length:', html.length, 'chars)');
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      } else {
        await browser.close();
        return NextResponse.json({ error: 'No HTML or URL provided for PDF generation' }, { status: 400 });
      }
    } catch (contentErr: any) {
      console.error('[Puppeteer setContent Error Stack Trace]:', contentErr?.stack || contentErr);
      await browser.close();
      return NextResponse.json({ error: 'Failed to set page content', details: contentErr?.message }, { status: 500 });
    }

    // Ensure all images and custom font-faces are fully loaded
    try {
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
    } catch (evalErr: any) {
      console.warn('[Puppeteer font/image wait warning]:', evalErr?.message);
    }

    console.log('[Puppeteer Debug] Generating PDF buffer via page.pdf()...');
    let pdfBuffer: any = null;
    try {
      pdfBuffer = await page.pdf({
        printBackground: true,
        width: '794px',
        preferCSSPageSize: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });
      console.log('[Puppeteer Debug] PDF buffer generated successfully (size:', pdfBuffer?.length, 'bytes).');
    } catch (pdfErr: any) {
      console.error('[Puppeteer page.pdf() Error Stack Trace]:', pdfErr?.stack || pdfErr);
      await browser.close();
      return NextResponse.json({ error: 'Failed to generate PDF buffer', details: pdfErr?.message }, { status: 500 });
    }

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
    console.error('[API export-pdf Route Fatal Error Stack Trace]:', err?.stack || err);
    return NextResponse.json({ error: err.message || 'PDF Export Failed', stack: err?.stack }, { status: 500 });
  }
}
