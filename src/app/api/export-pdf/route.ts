import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, url, filename = 'Quotation_Proposal.pdf' } = body;

    let chromiumModule: any;
    let puppeteer: typeof import('puppeteer-core');

    try {
      chromiumModule = (await import('@sparticuz/chromium')).default;
      puppeteer = await import('puppeteer-core');
    } catch (e: any) {
      return NextResponse.json({ error: `Puppeteer modules import error: ${e?.message}` }, { status: 500 });
    }

    const executablePath = typeof chromiumModule?.executablePath === 'function' 
      ? await chromiumModule.executablePath() 
      : (process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

    const browser = await puppeteer.launch({
      args: chromiumModule?.args || ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle0' as any, timeout: 30000 });
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 30000 });
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
