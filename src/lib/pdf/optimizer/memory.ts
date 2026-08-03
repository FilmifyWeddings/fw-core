import { PDFLogger } from '../utils/logger';

export class MemoryManager {
  static triggerGC() {
    if (global.gc && typeof global.gc === 'function') {
      try {
        global.gc();
        PDFLogger.info('Forced Garbage Collection executed successfully.');
      } catch (err) {
        PDFLogger.warn('Failed to execute forced Garbage Collection:', err);
      }
    }
  }

  static getMemoryUsage() {
    const memory = process.memoryUsage();
    return {
      rssMB: (memory.rss / (1024 * 1024)).toFixed(2),
      heapTotalMB: (memory.heapTotal / (1024 * 1024)).toFixed(2),
      heapUsedMB: (memory.heapUsed / (1024 * 1024)).toFixed(2),
      externalMB: (memory.external / (1024 * 1024)).toFixed(2),
    };
  }
}
