import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log("API START");
  console.log("API reached");

  let body: any = {};
  try {
    body = await req.json();
  } catch (jsonErr: any) {
    console.error("PARSE REQUEST BODY FAILED", jsonErr);
    console.error(jsonErr?.stack);
    return NextResponse.json({
      step: "PARSE REQUEST BODY",
      error: jsonErr?.message || 'Invalid JSON request body',
      stack: jsonErr?.stack || ''
    }, { status: 400 });
  }

  const { html, url, filename = 'Quotation_Proposal.pdf' } = body;

  // STEP 1: IMPORT CHROMIUM & PUPPETEER
  let chromiumModule: any = null;
  let puppeteerModule: any = null;
  try {
    chromiumModule = (await import('@sparticuz/chromium')).default;
    puppeteerModule = await import('puppeteer-core');
  } catch (importErr: any) {
    console.error("IMPORT MODULES FAILED", importErr);
    console.error(importErr?.stack);
    return NextResponse.json({
      step: "IMPORT MODULES",
      error: importErr?.message || 'PDF generation module unavailable on server',
      stack: importErr?.stack || ''
    }, { status: 500 });
  }

  // STEP 2: RESOLVE EXECUTABLE PATH
  let executablePath = process.env.CHROMIUM_PATH || '';
  try {
    if (!executablePath && chromiumModule && typeof chromiumModule.executablePath === 'function') {
      executablePath = await chromiumModule.executablePath();
    }
  } catch (pathErr: any) {
    console.warn("CHROMIUM EXECUTABLE PATH EXTRACTION WARNING", pathErr);
    console.warn(pathErr?.stack);
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
      console.warn("COMMON PATHS SEARCH WARNING", fsErr);
    }
  }

  console.log("Executable Path:", executablePath);
  console.log("Executable:", executablePath);
  console.log("Using Chromium:", executablePath);

  if (!executablePath) {
    const noPathErr = new Error('No valid Chromium executable binary found on server environment. Please install chromium-browser on VPS.');
    console.error("RESOLVE EXECUTABLE PATH FAILED", noPathErr);
    console.error(noPathErr.stack);
    return NextResponse.json({
      step: "RESOLVE EXECUTABLE PATH",
      error: noPathErr.message,
      stack: noPathErr.stack
    }, { status: 500 });
  }

  // STEP 3: PUPPETEER LAUNCH
  console.log("Launching Chromium...");
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
    console.error("PUPPETEER LAUNCH FAILED", launchErr);
    console.error(launchErr?.stack);
    return NextResponse.json({
      step: "PUPPETEER LAUNCH",
      error: launchErr?.message || 'Failed to launch Chromium browser process',
      stack: launchErr?.stack || ''
    }, { status: 500 });
  }

  // STEP 4: BROWSER NEW PAGE
  console.log("Creating Page...");
  let page: any = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  } catch (pageErr: any) {
    console.error("BROWSER NEW PAGE FAILED", pageErr);
    console.error(pageErr?.stack);
    await browser.close();
    return NextResponse.json({
      step: "BROWSER NEW PAGE",
      error: pageErr?.message || 'Failed to create new browser page',
      stack: pageErr?.stack || ''
    }, { status: 500 });
  }

  // STEP 5: PAGE SET CONTENT
  console.log("Calling page.setContent...");
  try {
    if (url) {
      console.log('[Puppeteer Debug] Navigating to URL:', url);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } else if (html) {
      console.log('[Puppeteer Debug] Setting HTML content (length:', html.length, 'chars)');
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    } else {
      await browser.close();
      return NextResponse.json({ step: "PAGE SET CONTENT", error: 'No HTML or URL provided for PDF generation' }, { status: 400 });
    }
  } catch (contentErr: any) {
    console.error("PAGE SET CONTENT FAILED", contentErr);
    console.error(contentErr?.stack);
    await browser.close();
    return NextResponse.json({
      step: "PAGE SET CONTENT",
      error: contentErr?.message || 'Failed to set page content',
      stack: contentErr?.stack || ''
    }, { status: 500 });
  }

  // STEP 6: PAGE EVALUATE (FONT & IMAGE WAIT)
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
    console.warn("PAGE EVALUATE WARNING", evalErr);
    console.warn(evalErr?.stack);
  }

  // STEP 7: PAGE PDF
  console.log("Calling page.pdf()...");
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
    console.error("PAGE PDF FAILED", pdfErr);
    console.error(pdfErr?.stack);
    await browser.close();
    return NextResponse.json({
      step: "PAGE PDF",
      error: pdfErr?.message || 'Failed to generate PDF buffer',
      stack: pdfErr?.stack || ''
    }, { status: 500 });
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
}
