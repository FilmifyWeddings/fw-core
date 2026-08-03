import { BrowserInstanceWrapper } from './instance';
import { PDF_ENGINE_CONFIG } from '../config';
import { PDFLogger } from '../utils/logger';

export class BrowserPool {
  private static instance: BrowserPool;
  private pool: BrowserInstanceWrapper[] = [];
  private waitQueue: Array<(instance: BrowserInstanceWrapper) => void> = [];

  private constructor() {}

  static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  async acquire(): Promise<BrowserInstanceWrapper> {
    // 1. Find available idle browser in pool
    for (const wrapper of this.pool) {
      if (!wrapper.isBusy && (await wrapper.isHealthy())) {
        // Recycle instance if it exceeded max operations limit
        if (wrapper.operationCount >= PDF_ENGINE_CONFIG.maxOperationsPerInstance) {
          PDFLogger.info(`Recycling BrowserInstance ${wrapper.id} after ${wrapper.operationCount} operations`);
          await wrapper.close();
          await wrapper.init();
        }
        wrapper.isBusy = true;
        wrapper.operationCount++;
        return wrapper;
      }
    }

    // 2. Spawn new browser instance if under pool limit
    if (this.pool.length < PDF_ENGINE_CONFIG.maxPoolSize) {
      const id = `browser-pool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const wrapper = new BrowserInstanceWrapper(id);
      await wrapper.init();
      wrapper.isBusy = true;
      wrapper.operationCount++;
      this.pool.push(wrapper);
      return wrapper;
    }

    // 3. Queue request if pool is at max capacity
    PDFLogger.info('Browser Pool max capacity reached, queuing request...');
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(wrapper: BrowserInstanceWrapper): void {
    wrapper.isBusy = false;
    PDFLogger.info(`Released BrowserInstance ${wrapper.id}`);

    if (this.waitQueue.length > 0) {
      const nextRequest = this.waitQueue.shift();
      if (nextRequest) {
        wrapper.isBusy = true;
        wrapper.operationCount++;
        nextRequest(wrapper);
      }
    }
  }

  async destroyPool(): Promise<void> {
    PDFLogger.info('Destroying all instances in Browser Pool...');
    for (const wrapper of this.pool) {
      await wrapper.close();
    }
    this.pool = [];
    this.waitQueue = [];
  }
}
