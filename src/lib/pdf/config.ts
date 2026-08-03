export const DEFAULT_PDF_CONFIG = {
  defaultViewportWidth: 794,
  defaultViewportHeight: 1123,
  deviceScaleFactor: 2,
  renderTimeoutMs: 30000,
  chromiumLaunchArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
    '--force-color-profile=srgb',
  ],
  commonChromiumPaths: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
};
