import { CHROMIUM_LAUNCH_ARGS, COMMON_CHROMIUM_BINARY_PATHS, PDF_ENGINE_CONFIG } from '../config';
import { PDFLogger } from '../utils/logger';

let chromiumModule: any = null;
let puppeteerModule: any = null;

async function loadPuppeteerModules() {
  if (!chromiumModule || !puppeteerModule) {
    chromiumModule = (await import('@sparticuz/chromium')).default;
    puppeteerModule = await import('puppeteer-core');
  }
  return { chromiumModule, puppeteerModule };
}

export class BrowserInstanceWrapper {
  public browser: any = null;
  public operationCount: number = 0;
  public createdAt: number = Date.now();
  public isBusy: boolean = false;
  public id: string;

  constructor(id: string) {
    this.id = id;
  }

  async resolveExecutablePath(): Promise<string> {
    const fs = await import('fs');
    let executablePath = process.env.CHROMIUM_PATH || '';

    if (executablePath && (!fs.existsSync(executablePath) || !fs.statSync(executablePath).isFile())) {
      executablePath = '';
    }

    // On Windows development systems, prioritize locally installed Chrome
    if (!executablePath && process.platform === 'win32') {
      for (const p of COMMON_CHROMIUM_BINARY_PATHS) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          executablePath = p;
          break;
        }
      }
    }

    const { chromiumModule } = await loadPuppeteerModules();

    // On Linux/Server environments, use Sparticuz Chromium executablePath extractor
    if (!executablePath && chromiumModule && typeof chromiumModule.executablePath === 'function') {
      try {
        const extractedPath = await chromiumModule.executablePath();
        if (extractedPath && fs.existsSync(extractedPath) && fs.statSync(extractedPath).isFile()) {
          executablePath = extractedPath;
        }
      } catch (err: any) {
        PDFLogger.warn('Sparticuz executablePath warning', err);
      }
    }

    // Fallback to common Linux system paths (/usr/bin/chromium-browser, etc.)
    if (!executablePath) {
      try {
        for (const p of COMMON_CHROMIUM_BINARY_PATHS) {
          if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            executablePath = p;
            break;
          }
        }
      } catch (fsErr: any) {
        PDFLogger.warn('Common paths search warning', fsErr);
      }
    }

    return executablePath;
  }

  async init(): Promise<void> {
    const { chromiumModule, puppeteerModule } = await loadPuppeteerModules();
    const executablePath = await this.resolveExecutablePath();

    if (!executablePath) {
      throw new Error('Chromium binary path not configured on server environment');
    }

    PDFLogger.info(`Initializing BrowserInstance ${this.id} with path: ${executablePath}`);
    this.browser = await puppeteerModule.launch({
      args: chromiumModule?.args || CHROMIUM_LAUNCH_ARGS,
      defaultViewport: {
        width: PDF_ENGINE_CONFIG.defaultViewportWidth,
        height: PDF_ENGINE_CONFIG.defaultViewportHeight,
        deviceScaleFactor: PDF_ENGINE_CONFIG.deviceScaleFactor,
      },
      executablePath,
      headless: true,
    });

    this.operationCount = 0;
    this.createdAt = Date.now();
    this.isBusy = false;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.browser) return false;
    try {
      return this.browser.isConnected();
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        PDFLogger.warn(`Error closing browser instance ${this.id}:`, err);
      } finally {
        this.browser = null;
        this.isBusy = false;
      }
    }
  }
}
