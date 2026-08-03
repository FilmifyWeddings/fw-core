import { DEFAULT_PDF_CONFIG } from '../config';

let chromiumModule: any = null;
let puppeteerModule: any = null;

async function loadPuppeteerModules() {
  if (!chromiumModule || !puppeteerModule) {
    chromiumModule = (await import('@sparticuz/chromium')).default;
    puppeteerModule = await import('puppeteer-core');
  }
  return { chromiumModule, puppeteerModule };
}

/**
 * Resolves Chrome/Chromium binary executable path on server.
 */
export async function resolveChromiumExecutablePath(): Promise<string> {
  let executablePath = process.env.CHROMIUM_PATH || '';
  const { chromiumModule } = await loadPuppeteerModules();

  if (!executablePath && chromiumModule && typeof chromiumModule.executablePath === 'function') {
    try {
      executablePath = await chromiumModule.executablePath();
    } catch (err: any) {
      console.warn('[PDF Engine] Sparticuz chromium path warning:', err?.message);
    }
  }

  if (!executablePath) {
    try {
      const fs = await import('fs');
      for (const p of DEFAULT_PDF_CONFIG.commonChromiumPaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }
    } catch (fsErr: any) {
      console.warn('[PDF Engine] Common paths search warning:', fsErr?.message);
    }
  }

  return executablePath;
}

/**
 * Launches Chromium browser instance.
 */
export async function launchPDFBrowser() {
  const { chromiumModule, puppeteerModule } = await loadPuppeteerModules();
  const executablePath = await resolveChromiumExecutablePath();

  if (!executablePath) {
    throw new Error('Chromium binary path not found on server environment');
  }

  console.log('[PDF Engine] Launching Puppeteer with executable:', executablePath);
  return await puppeteerModule.launch({
    args: chromiumModule?.args || DEFAULT_PDF_CONFIG.chromiumLaunchArgs,
    defaultViewport: {
      width: DEFAULT_PDF_CONFIG.defaultViewportWidth,
      height: DEFAULT_PDF_CONFIG.defaultViewportHeight,
      deviceScaleFactor: DEFAULT_PDF_CONFIG.deviceScaleFactor,
    },
    executablePath,
    headless: true,
  });
}

/**
 * Render single page HTML into a PDF Uint8Array buffer with exact page dimensions.
 */
export async function renderSinglePageToBuffer(
  browser: any,
  html: string,
  widthPx: number,
  heightPx: number
): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: widthPx,
      height: heightPx,
      deviceScaleFactor: DEFAULT_PDF_CONFIG.deviceScaleFactor,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: DEFAULT_PDF_CONFIG.renderTimeoutMs,
    });

    // Wait for fonts and images to settle completely
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
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      preferCSSPageSize: false,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    return pdfBuffer;
  } finally {
    await page.close();
  }
}
