export class PDFLogger {
  static info(message: string, context?: any) {
    console.log(`[PDF Engine Info] ${message}`, context ? (typeof context === 'object' ? JSON.stringify(context) : context) : '');
  }

  static warn(message: string, context?: any) {
    console.warn(`[PDF Engine Warning] ${message}`, context ? (typeof context === 'object' ? JSON.stringify(context) : context) : '');
  }

  static error(message: string, err?: any) {
    console.error(`[PDF Engine Error] ${message}:`, err?.message || err);
    if (err?.stack) {
      console.error(`[PDF Engine Error Stack Trace]:`, err.stack);
    }
  }
}
