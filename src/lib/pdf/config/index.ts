import { PDFEngineConfig } from '../types';

export const PDF_ENGINE_CONFIG: PDFEngineConfig = {
  maxPoolSize: 4,
  maxOperationsPerInstance: 50,
  instanceTimeoutMs: 60000,
  renderTimeoutMs: 45000,
  deviceScaleFactor: 2,
  defaultViewportWidth: 794,
  defaultViewportHeight: 1123,
};

export const CHROMIUM_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--font-render-hinting=none',
  '--force-color-profile=srgb',
  '--hide-scrollbars',
  '--mute-audio',
];

export const COMMON_CHROMIUM_BINARY_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/usr/bin/google-chrome-stable',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
